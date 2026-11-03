/**
 * GitHub Operations — Host half.
 *
 * 十个通用 GitHub 工具，覆盖「看 → 改 → 发 → 评审 → 追 CI / issue」：
 *   read:  github_status, github_pr_list, github_pr_view, github_checks, github_issue_list
 *   write: github_repo_create, github_commit_push, github_pr_create, github_pr_review, github_issue_create
 *
 * 认证复用本机 `gh` CLI 的登录态（`gh auth login`），插件自己不经手任何 token。
 * 写操作在真正执行前向会话申请一次审批：`ask` 策略会弹窗，`never` 策略直接拒绝
 * （fail closed），审批结果会记进会话审计日志。
 *
 * 不绑定任何仓库：每次调用由参数 `repo`（owner/name）或当前会话工作区决定目标。
 */
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'

export const inject = ['tools']

const MANIFEST = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

const OUTPUT_SCHEMA = { type: 'object', additionalProperties: true }

export function apply(ctx, config) {
  const cfg = {
    ghPath: 'gh',
    gitPath: 'git',
    timeoutMs: 60000,
    writeTimeoutMs: 180000,
    requireApproval: true,
    defaultRemote: 'origin',
    maxBodyChars: 4000,
    ...(config && typeof config === 'object' ? config : {}),
  }

  // ---------------------------------------------------------------- plumbing

  function exec(bin, args, options) {
    const { cwd, signal, timeoutMs, retries } = options || {}
    const attempts = 1 + Math.max(0, Math.min(3, Number(retries) || 0))

    function once() {
      return new Promise((resolve) => {
        execFile(
          bin,
          args,
          {
            cwd,
            signal,
            timeout: timeoutMs || cfg.timeoutMs,
            maxBuffer: 16 * 1024 * 1024,
            env: {
              ...process.env,
              GH_PROMPT_DISABLED: '1',
              GH_NO_UPDATE_NOTIFIER: '1',
              GH_PAGER: 'cat',
              NO_COLOR: '1',
            },
          },
          (error, stdout, stderr) => {
            resolve({
              ok: !error,
              notFound: Boolean(error && error.code === 'ENOENT'),
              stdout: String(stdout || ''),
              stderr: String(stderr || ''),
              status: error && typeof error.code === 'number' ? error.code : error ? 1 : 0,
            })
          },
        )
      })
    }

    async function attempt() {
      let left = attempts
      for (;;) {
        const result = await once()
        const retryable = !result.ok && left > 1 && !(signal && signal.aborted) && transient(result)
        if (!retryable) return result
        left -= 1
        await new Promise((done) => setTimeout(done, 700))
      }
    }

    return attempt()
  }

  async function runGh(args, options) {
    const result = await exec(cfg.ghPath, args, options)
    if (result.notFound) {
      throw new Error(`找不到 gh 命令（${cfg.ghPath}）。先安装 GitHub CLI 并执行 gh auth login。`)
    }
    if (!result.ok) throw new Error(trim(`gh ${args.join(' ')} 失败：${result.stderr || result.stdout}`))
    return result.stdout.trim()
  }

  async function runGit(args, options) {
    const result = await exec(cfg.gitPath, args, options)
    if (result.notFound) throw new Error(`找不到 git 命令（${cfg.gitPath}）。`)
    if (!result.ok) throw new Error(trim(`git ${args.join(' ')} 失败：${result.stderr || result.stdout}`))
    return result.stdout.trim()
  }

  async function ghJson(args, options) {
    const text = await runGh(args, { retries: 1, ...(options || {}) })
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`gh 返回了非 JSON 内容：${trim(text, 300)}`)
    }
  }

  async function cwdOf(execCtx, override) {
    if (typeof override === 'string' && override.trim()) return override.trim()
    const workingDirectory = ctx.get('workingDirectory')
    if (workingDirectory) {
      try {
        return await workingDirectory.ensure(execCtx.agent, execCtx.signal)
      } catch {
        /* 没有会话工作区时退回进程目录 */
      }
    }
    return process.cwd()
  }

  /** 写操作闸门：`ask` 询问、`never` 拒绝、无 approval 服务也拒绝。 */
  async function gate(execCtx, toolName, zh, en) {
    if (!cfg.requireApproval) return
    const approval = ctx.get('approval')
    if (!approval) throw new Error(`${toolName} 需要审批，但当前 profile 未挂载 approval 服务，已拒绝执行。`)
    if (!execCtx.agent) throw new Error(`${toolName} 需要审批，但本次调用没有关联 agent，已拒绝执行。`)
    const outcome = await approval.request({
      agent: execCtx.agent,
      toolName,
      callId: execCtx.callId,
      reason: zh,
      displayReason: { zh, en },
      signal: execCtx.signal,
    })
    if (outcome !== 'allowed-once') {
      throw new Error(`操作未获批准（${outcome}）：${zh}`)
    }
  }

  const repoFlags = (repo) => (typeof repo === 'string' && repo.trim() ? ['--repo', repo.trim()] : [])

  // ------------------------------------------------------------- summaries

  function summarizeRollup(rollup) {
    const entries = Array.isArray(rollup) ? rollup : []
    let failing = 0
    let pending = 0
    let ok = 0
    const failedNames = []
    for (const entry of entries) {
      const conclusion = String(entry.conclusion || entry.state || '').toUpperCase()
      if (!conclusion || conclusion === 'PENDING' || conclusion === 'QUEUED' || conclusion === 'IN_PROGRESS' || conclusion === 'EXPECTED') {
        pending += 1
      } else if (['SUCCESS', 'NEUTRAL', 'SKIPPED'].includes(conclusion)) {
        ok += 1
      } else {
        failing += 1
        if (failedNames.length < 5) failedNames.push(entry.name || entry.context || 'check')
      }
    }
    return { total: entries.length, ok, pending, failing, failedNames }
  }

  function summarizeReviews(reviews) {
    const list = Array.isArray(reviews) ? reviews : []
    const latest = new Map()
    for (const review of list) {
      const login = (review.author && review.author.login) || 'unknown'
      latest.set(login, { author: login, state: review.state || null })
    }
    return [...latest.values()]
  }

  const clip = (value, limit = cfg.maxBodyChars) => {
    const text = typeof value === 'string' ? value : ''
    return text.length > limit ? text.slice(0, limit) + `\n…（已截断，共 ${text.length} 字符）` : text
  }

  // ---------------------------------------------------------------- tools

  const tools = [
    {
      name: 'github_status',
      description:
        'Show the GitHub identity of the local gh login and the state of the current workspace repository: branch, ahead/behind, uncommitted files, last commit, remote URL, and the GitHub repo metadata (visibility, default branch, stars). Pass `repo` to inspect any owner/name instead of the local repository.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Optional owner/name to inspect a specific GitHub repository.' },
          cwd: { type: 'string', description: 'Optional working directory to inspect instead of the session workspace.' },
        },
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (args, value) => renderJson(value) },
      isConcurrencySafe: () => true,
      presentCall: (args) => ({ card: 'generic', title: args && args.repo ? `GitHub status: ${args.repo}` : 'GitHub status', kind: 'read' }),
      async execute(args, execCtx) {
        const input = args || {}
        const cwd = await cwdOf(execCtx, input.cwd)
        const identity = await ghJson(['api', 'user', '--jq', '{login: .login, name: .name, id: .id}'], {
          cwd,
          signal: execCtx.signal,
        }).catch(() => null)

        const workspace = { cwd, isRepo: false }
        const probe = await exec(cfg.gitPath, ['rev-parse', '--is-inside-work-tree'], { cwd, signal: execCtx.signal })
        if (probe.ok && probe.stdout.trim() === 'true') {
          workspace.isRepo = true
          const branchLine = await runGit(['status', '--porcelain=v1', '--branch'], { cwd, signal: execCtx.signal })
          const [first, ...rest] = branchLine.split('\n')
          const match = /^## ([^.]+?)(?:\.\.\.(\S+))?(?: \[(.+)\])?$/.exec(first || '')
          workspace.branch = match ? match[1] : null
          workspace.upstream = match && match[2] ? match[2] : null
          const tracking = match && match[3] ? match[3] : ''
          workspace.ahead = Number((/ahead (\d+)/.exec(tracking) || [])[1] || 0)
          workspace.behind = Number((/behind (\d+)/.exec(tracking) || [])[1] || 0)
          workspace.dirtyFiles = rest.filter(Boolean).length
          workspace.lastCommit = await runGit(['log', '-1', '--format=%h%x09%s%x09%an%x09%ar'], {
            cwd,
            signal: execCtx.signal,
          }).catch(() => null)
          const remote = await runGit(['remote', '-v'], { cwd, signal: execCtx.signal }).catch(() => '')
          const origin = remote.split('\n').find((line) => line.startsWith(cfg.defaultRemote + '\t')) || remote.split('\n')[0] || ''
          const parts = origin.split(/\s+/)
          workspace.remote = parts.length > 1 ? parts[1] : null
        }

        let repo = null
        const target = typeof input.repo === 'string' && input.repo.trim() ? input.repo.trim() : null
        if (target) {
          repo = await ghJson(
            ['repo', 'view', target, '--json', 'nameWithOwner,url,isPrivate,visibility,description,defaultBranchRef,stargazerCount,pushedAt'],
            { cwd, signal: execCtx.signal },
          ).catch((error) => ({ error: error.message }))
        } else if (workspace.remote && /github\.com/.test(workspace.remote)) {
          repo = await ghJson(
            ['repo', 'view', '--json', 'nameWithOwner,url,isPrivate,visibility,description,defaultBranchRef,stargazerCount,pushedAt'],
            { cwd, signal: execCtx.signal },
          ).catch((error) => ({ error: error.message }))
        }

        return { plugin: { name: MANIFEST.name, version: MANIFEST.version }, identity, workspace, repo }
      },
    },

    {
      name: 'github_pr_list',
      description:
        'List pull requests for a repository (defaults to the current workspace repo), with author, draft state, mergeability, review decision, changed size and a rolled-up CI status. Sorted by most recently updated.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Optional owner/name. Defaults to the current repository.' },
          state: { type: 'string', enum: ['open', 'closed', 'merged', 'all'], description: 'Default open.' },
          limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Default 20.' },
          author: { type: 'string', description: 'Filter by author login, or @me.' },
          cwd: { type: 'string', description: 'Optional working directory.' },
        },
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (args, value) => renderJson(value) },
      isConcurrencySafe: () => true,
      presentCall: (args) => ({ card: 'generic', title: `GitHub PRs${args && args.repo ? ': ' + args.repo : ''}`, kind: 'read' }),
      async execute(args, execCtx) {
        const input = args || {}
        const cwd = await cwdOf(execCtx, input.cwd)
        const fields = 'number,title,state,isDraft,mergeable,mergeStateStatus,reviewDecision,author,headRefName,baseRefName,updatedAt,url,additions,deletions,changedFiles,statusCheckRollup'
        const cli = ['pr', 'list', '--json', fields, '--limit', String(input.limit || 20), '--state', input.state || 'open']
        if (input.author) cli.push('--author', input.author)
        cli.push(...repoFlags(input.repo))
        const rows = (await ghJson(cli, { cwd, signal: execCtx.signal })) || []
        return {
          count: rows.length,
          pullRequests: rows.map((row) => ({
            number: row.number,
            title: row.title,
            author: (row.author && row.author.login) || null,
            draft: Boolean(row.isDraft),
            state: row.state,
            mergeable: row.mergeable,
            mergeStateStatus: row.mergeStateStatus,
            reviewDecision: row.reviewDecision || null,
            head: row.headRefName,
            base: row.baseRefName,
            additions: row.additions,
            deletions: row.deletions,
            changedFiles: row.changedFiles,
            checks: summarizeRollup(row.statusCheckRollup),
            url: row.url,
            updatedAt: row.updatedAt,
          })),
        }
      },
    },

    {
      name: 'github_pr_view',
      description:
        'Read one pull request in detail: description, branch pair, changed files, commits, reviews and CI checks. Use this before reviewing, merging, or commenting on a PR.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'integer', description: 'Pull request number.' },
          repo: { type: 'string', description: 'Optional owner/name. Defaults to the current repository.' },
          includeFiles: { type: 'boolean', description: 'Include the changed file list (default true).' },
          cwd: { type: 'string', description: 'Optional working directory.' },
        },
        required: ['number'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (args, value) => renderJson(value) },
      isConcurrencySafe: () => true,
      presentCall: (args) => ({ card: 'generic', title: `GitHub PR #${(args && args.number) || '?'}`, kind: 'read' }),
      async execute(args, execCtx) {
        const input = args || {}
        if (!Number.isInteger(input.number)) throw new Error('number 必须是整数。')
        const cwd = await cwdOf(execCtx, input.cwd)
        const fields = 'number,title,body,state,isDraft,author,baseRefName,headRefName,mergeable,mergeStateStatus,reviewDecision,url,additions,deletions,changedFiles,createdAt,updatedAt,statusCheckRollup,reviews,commits,files'
        const pr = await ghJson(['pr', 'view', String(input.number), '--json', fields, ...repoFlags(input.repo)], {
          cwd,
          signal: execCtx.signal,
        })
        const includeFiles = input.includeFiles !== false
        const payload = {
          number: pr.number,
          title: pr.title,
          body: clip(pr.body),
          author: (pr.author && pr.author.login) || null,
          state: pr.state,
          draft: Boolean(pr.isDraft),
          head: pr.headRefName,
          base: pr.baseRefName,
          mergeable: pr.mergeable,
          mergeStateStatus: pr.mergeStateStatus,
          reviewDecision: pr.reviewDecision || null,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changedFiles,
          url: pr.url,
          createdAt: pr.createdAt,
          updatedAt: pr.updatedAt,
          checks: summarizeRollup(pr.statusCheckRollup),
          reviews: summarizeReviews(pr.reviews),
          commits: (pr.commits || []).slice(-20).map((commit) => ({
            sha: String(commit.oid || '').slice(0, 7),
            headline: commit.messageHeadline || '',
          })),
        }
        if (includeFiles) {
          payload.files = (pr.files || []).slice(0, 100).map((file) => ({
            path: file.path,
            additions: file.additions,
            deletions: file.deletions,
          }))
        }
        return payload
      },
    },

    {
      name: 'github_checks',
      description:
        'Report CI checks for a pull request or a commit ref: each run’s name, status and conclusion, plus a failure summary that names the failing jobs.',
      parameters: {
        type: 'object',
        properties: {
          pr: { type: 'integer', description: 'Pull request number to inspect.' },
          ref: { type: 'string', description: 'Commit SHA or branch (default HEAD). Ignored when pr is given.' },
          repo: { type: 'string', description: 'Optional owner/name. Defaults to the current repository.' },
          cwd: { type: 'string', description: 'Optional working directory.' },
        },
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (args, value) => renderJson(value) },
      isConcurrencySafe: () => true,
      presentCall: (args) => ({ card: 'generic', title: 'GitHub checks', kind: 'read' }),
      async execute(args, execCtx) {
        const input = args || {}
        const cwd = await cwdOf(execCtx, input.cwd)
        if (Number.isInteger(input.pr)) {
          const pr = await ghJson(
            ['pr', 'view', String(input.pr), '--json', 'number,title,url,statusCheckRollup', ...repoFlags(input.repo)],
            { cwd, signal: execCtx.signal },
          )
          const summary = summarizeRollup(pr.statusCheckRollup)
          return {
            target: { kind: 'pull-request', number: pr.number, title: pr.title, url: pr.url },
            summary,
            checks: (pr.statusCheckRollup || []).map((entry) => ({
              name: entry.name || entry.context || 'check',
              status: entry.status || entry.state || null,
              conclusion: entry.conclusion || null,
            })),
          }
        }
        const ref = (input.ref || 'HEAD').trim()
        const repoPath = typeof input.repo === 'string' && input.repo.trim() ? `repos/${input.repo.trim()}` : 'repos/{owner}/{repo}'
        const body = await ghJson(
          ['api', `${repoPath}/commits/${encodeURIComponent(ref)}/check-runs?per_page=100`],
          { cwd, signal: execCtx.signal },
        )
        const runs = (body && body.check_runs) || []
        return {
          target: { kind: 'ref', ref },
          summary: {
            total: runs.length,
            ok: runs.filter((run) => run.conclusion === 'success').length,
            pending: runs.filter((run) => run.status !== 'completed').length,
            failing: runs.filter((run) => run.status === 'completed' && !['success', 'neutral', 'skipped'].includes(run.conclusion)).length,
            failedNames: runs
              .filter((run) => run.status === 'completed' && !['success', 'neutral', 'skipped'].includes(run.conclusion))
              .slice(0, 5)
              .map((run) => run.name),
          },
          checks: runs.map((run) => ({ name: run.name, status: run.status, conclusion: run.conclusion })),
        }
      },
    },

    {
      name: 'github_issue_list',
      description: 'List issues for a repository (pull requests are excluded by GitHub), with labels, author and state.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Optional owner/name. Defaults to the current repository.' },
          state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Default open.' },
          limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Default 20.' },
          labels: { type: 'array', items: { type: 'string' }, description: 'Only issues carrying all of these labels.' },
          cwd: { type: 'string', description: 'Optional working directory.' },
        },
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (args, value) => renderJson(value) },
      isConcurrencySafe: () => true,
      presentCall: (args) => ({ card: 'generic', title: `GitHub issues${args && args.repo ? ': ' + args.repo : ''}`, kind: 'read' }),
      async execute(args, execCtx) {
        const input = args || {}
        const cwd = await cwdOf(execCtx, input.cwd)
        const cli = [
          'issue',
          'list',
          '--json',
          'number,title,state,author,labels,updatedAt,url',
          '--limit',
          String(input.limit || 20),
          '--state',
          input.state || 'open',
        ]
        for (const label of input.labels || []) cli.push('--label', label)
        cli.push(...repoFlags(input.repo))
        const rows = (await ghJson(cli, { cwd, signal: execCtx.signal })) || []
        return {
          count: rows.length,
          issues: rows.map((row) => ({
            number: row.number,
            title: row.title,
            state: row.state,
            author: (row.author && row.author.login) || null,
            labels: (row.labels || []).map((label) => label.name),
            url: row.url,
            updatedAt: row.updatedAt,
          })),
        }
      },
    },

    {
      name: 'github_repo_create',
      description:
        'Create a GitHub repository from a local directory and optionally push it. Requires approval. Runs `gh repo create <name> --source <dir> --remote origin [--push]`.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Repository name, or owner/name to create it under an organization.' },
          private: { type: 'boolean', description: 'Create as private. Default true.' },
          description: { type: 'string', description: 'Repository description.' },
          cwd: { type: 'string', description: 'Local directory to publish. Defaults to the session workspace.' },
          push: { type: 'boolean', description: 'Push the current branch and set upstream right away. Default false.' },
        },
        required: ['name'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (args, value) => renderJson(value) },
      isConcurrencySafe: () => false,
      presentCall: (args) => ({ card: 'generic', title: `GitHub: create repo ${(args && args.name) || ''}`, kind: 'execute' }),
      async execute(args, execCtx) {
        const input = args || {}
        if (!input.name || typeof input.name !== 'string') throw new Error('name 必填。')
        const cwd = await cwdOf(execCtx, input.cwd)
        await gate(
          execCtx,
          'github_repo_create',
          `在 GitHub 创建仓库 ${input.name}（${input.private === false ? '公开' : '私有'}）${input.push ? '并推送当前分支' : ''}`,
          `Create GitHub repository ${input.name} (${input.private === false ? 'public' : 'private'})${input.push ? ' and push the current branch' : ''}`,
        )
        const cli = ['repo', 'create', input.name, '--source', cwd, '--remote', cfg.defaultRemote]
        cli.push(input.private === false ? '--public' : '--private')
        if (input.description) cli.push('--description', input.description)
        if (input.push) cli.push('--push')
        const probe = await exec(cfg.gitPath, ['rev-parse', '--is-inside-work-tree'], { cwd, signal: execCtx.signal })
        if (!probe.ok || probe.stdout.trim() !== 'true') {
          throw new Error(`${cwd} 不是 git 仓库，无法用 --source 发布；先 git init 并提交，或省略 cwd。`)
        }
        const output = await runGh(cli, { cwd, signal: execCtx.signal, timeoutMs: cfg.writeTimeoutMs })
        const url = (output.match(/https:\/\/github\.com\/[^\s]+/) || [])[0] || ''
        const ownerRepo = (/github\.com\/([^/\s]+\/[^/\s]+?)(?:\.git)?(?:\/|$)/.exec(url) || [])[1]
        const target = ownerRepo || input.name
        const repo = await ghJson(['repo', 'view', target, '--json', 'nameWithOwner,url,visibility,sshUrl'], {
          cwd,
          signal: execCtx.signal,
        }).catch(() => null)
        return { created: repo || null, output: trim(output, 500) }
      },
    },

    {
      name: 'github_commit_push',
      description:
        'Stage files, create a commit and optionally push, in the session workspace or a given directory. Requires approval. Refuses on an empty stage. Never force-pushes.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Commit message. Multi-line is fine.' },
          paths: { type: 'array', items: { type: 'string' }, description: 'Stage only these paths. Omit to stage everything (git add -A).' },
          push: { type: 'boolean', description: 'Push after committing. Default true.' },
          branch: { type: 'string', description: 'Push this branch instead of the current one.' },
          remote: { type: 'string', description: 'Remote name. Default origin.' },
          setUpstream: { type: 'boolean', description: 'Push with -u. Default true.' },
          cwd: { type: 'string', description: 'Repository directory. Defaults to the session workspace.' },
        },
        required: ['message'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (args, value) => renderJson(value) },
      isConcurrencySafe: () => false,
      presentCall: (args) => ({ card: 'generic', title: 'GitHub: commit & push', kind: 'execute' }),
      async execute(args, execCtx) {
        const input = args || {}
        if (!input.message || typeof input.message !== 'string') throw new Error('message 必填。')
        const cwd = await cwdOf(execCtx, input.cwd)
        const remote = input.remote || cfg.defaultRemote
        const push = input.push !== false
        const paths = Array.isArray(input.paths) ? input.paths.filter((p) => typeof p === 'string' && p) : []
        await gate(
          execCtx,
          'github_commit_push',
          `提交${paths.length ? ' ' + paths.length + ' 个路径' : '全部改动'}并${push ? '推送到 ' + remote : '仅本地提交'}：${input.message.split('\n')[0].slice(0, 80)}`,
          `Commit ${paths.length ? paths.length + ' paths' : 'all changes'} and ${push ? 'push to ' + remote : 'keep local'}: ${input.message.split('\n')[0].slice(0, 80)}`,
        )

        if (paths.length) await runGit(['add', '--', ...paths], { cwd, signal: execCtx.signal })
        else await runGit(['add', '-A'], { cwd, signal: execCtx.signal })

        const staged = await runGit(['diff', '--cached', '--name-only'], { cwd, signal: execCtx.signal })
        if (!staged) return { committed: false, pushed: false, reason: '暂存区为空，没有可提交的改动。' }

        const commitOutput = await runGit(['commit', '-m', input.message], { cwd, signal: execCtx.signal })
        const sha = await runGit(['rev-parse', '--short', 'HEAD'], { cwd, signal: execCtx.signal })
        const branch = input.branch || (await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, signal: execCtx.signal }))

        let pushed = false
        let pushOutput = ''
        if (push) {
          const cli = ['push']
          if (input.setUpstream !== false) cli.push('-u')
          cli.push(remote, `HEAD:${branch}`)
          pushOutput = await runGit(cli, { cwd, signal: execCtx.signal, timeoutMs: cfg.writeTimeoutMs })
          pushed = true
        }
        return {
          committed: true,
          sha,
          branch,
          files: staged.split('\n').filter(Boolean).slice(0, 50),
          pushed,
          commitOutput: trim(commitOutput, 300),
          pushOutput: trim(pushOutput, 300),
        }
      },
    },

    {
      name: 'github_pr_create',
      description:
        'Open a pull request from the current branch (or an explicit head/base pair). Requires approval. Returns the PR number and URL.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Pull request title.' },
          body: { type: 'string', description: 'Pull request body (Markdown).' },
          base: { type: 'string', description: 'Target branch. Defaults to the repository default branch.' },
          head: { type: 'string', description: 'Source branch. Defaults to the pushed current branch.' },
          draft: { type: 'boolean', description: 'Open as draft.' },
          repo: { type: 'string', description: 'Optional owner/name. Defaults to the current repository.' },
          cwd: { type: 'string', description: 'Optional working directory.' },
        },
        required: ['title'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (args, value) => renderJson(value) },
      isConcurrencySafe: () => false,
      presentCall: (args) => ({ card: 'generic', title: `GitHub: create PR ${(args && args.title ? '“' + String(args.title).slice(0, 40) + '”' : '')}`, kind: 'execute' }),
      async execute(args, execCtx) {
        const input = args || {}
        if (!input.title) throw new Error('title 必填。')
        const cwd = await cwdOf(execCtx, input.cwd)
        await gate(
          execCtx,
          'github_pr_create',
          `创建 PR：${input.title}${input.head ? '（' + input.head + (input.base ? ' → ' + input.base : '') + '）' : ''}`,
          `Open pull request: ${input.title}`,
        )
        const cli = ['pr', 'create', '--title', input.title]
        if (input.body) cli.push('--body', input.body)
        if (input.base) cli.push('--base', input.base)
        if (input.head) cli.push('--head', input.head)
        if (input.draft) cli.push('--draft')
        cli.push(...repoFlags(input.repo))
        const output = await runGh(cli, { cwd, signal: execCtx.signal, timeoutMs: cfg.writeTimeoutMs })
        const url = (output.match(/https:\/\/github\.com\/\S+/g) || [])[0] || null
        const pr = url
          ? await ghJson(['pr', 'view', url, '--json', 'number,title,url,state,isDraft,headRefName,baseRefName'], {
              cwd,
              signal: execCtx.signal,
            }).catch(() => null)
          : null
        return { created: Boolean(url), url, pullRequest: pr, output: trim(output, 400) }
      },
    },

    {
      name: 'github_pr_review',
      description:
        'Submit a pull request review: comment, approve, or request changes. Requires approval. Use github_pr_view first to read the diff, commits and existing reviews.',
      parameters: {
        type: 'object',
        properties: {
          number: { type: 'integer', description: 'Pull request number.' },
          action: { type: 'string', enum: ['comment', 'approve', 'request-changes'], description: 'Review action.' },
          body: { type: 'string', description: 'Review body. Required for comment and request-changes.' },
          repo: { type: 'string', description: 'Optional owner/name. Defaults to the current repository.' },
          cwd: { type: 'string', description: 'Optional working directory.' },
        },
        required: ['number', 'action'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (args, value) => renderJson(value) },
      isConcurrencySafe: () => false,
      presentCall: (args) => ({ card: 'generic', title: `GitHub: review PR #${(args && args.number) || '?'} (${(args && args.action) || ''})`, kind: 'execute' }),
      async execute(args, execCtx) {
        const input = args || {}
        if (!Number.isInteger(input.number)) throw new Error('number 必须是整数。')
        const action = input.action
        if (!['comment', 'approve', 'request-changes'].includes(action)) throw new Error('action 只能是 comment / approve / request-changes。')
        if (action !== 'approve' && !input.body) throw new Error(`${action} 需要提供 body。`)
        const cwd = await cwdOf(execCtx, input.cwd)
        await gate(
          execCtx,
          'github_pr_review',
          `对 PR #${input.number} 提交评审：${action}`,
          `Submit a ${action} review on PR #${input.number}`,
        )
        const flag = action === 'approve' ? '--approve' : action === 'request-changes' ? '--request-changes' : '--comment'
        const cli = ['pr', 'review', String(input.number), flag]
        if (input.body) cli.push('--body', input.body)
        cli.push(...repoFlags(input.repo))
        const output = await runGh(cli, { cwd, signal: execCtx.signal, timeoutMs: cfg.writeTimeoutMs })
        return { submitted: true, number: input.number, action, output: trim(output, 400) }
      },
    },

    {
      name: 'github_issue_create',
      description: 'Open an issue with optional labels and assignees. Requires approval.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Issue title.' },
          body: { type: 'string', description: 'Issue body (Markdown).' },
          labels: { type: 'array', items: { type: 'string' }, description: 'Labels to apply.' },
          assignees: { type: 'array', items: { type: 'string' }, description: 'Logins to assign.' },
          repo: { type: 'string', description: 'Optional owner/name. Defaults to the current repository.' },
          cwd: { type: 'string', description: 'Optional working directory.' },
        },
        required: ['title'],
        additionalProperties: false,
      },
      output: { schema: OUTPUT_SCHEMA, render: (args, value) => renderJson(value) },
      isConcurrencySafe: () => false,
      presentCall: (args) => ({ card: 'generic', title: `GitHub: open issue ${(args && args.title ? '“' + String(args.title).slice(0, 40) + '”' : '')}`, kind: 'execute' }),
      async execute(args, execCtx) {
        const input = args || {}
        if (!input.title) throw new Error('title 必填。')
        const cwd = await cwdOf(execCtx, input.cwd)
        await gate(execCtx, 'github_issue_create', `创建 issue：${input.title}`, `Open issue: ${input.title}`)
        const cli = ['issue', 'create', '--title', input.title]
        if (input.body) cli.push('--body', input.body)
        for (const label of input.labels || []) cli.push('--label', label)
        for (const assignee of input.assignees || []) cli.push('--assignee', assignee)
        cli.push(...repoFlags(input.repo))
        const output = await runGh(cli, { cwd, signal: execCtx.signal, timeoutMs: cfg.writeTimeoutMs })
        const url = (output.match(/https:\/\/github\.com\/\S+/g) || [])[0] || null
        return { created: Boolean(url), url, output: trim(output, 300) }
      },
    },
  ]

  for (const definition of tools) {
    ctx.effect(() => ctx.tools.register(definition), `github-ops: ${definition.name}`)
  }
}

// ------------------------------------------------------------------ helpers

function trim(text, limit = 800) {
  const value = String(text || '').trim()
  return value.length > limit ? value.slice(0, limit) + '…' : value
}

function renderJson(value) {
  return [{ type: 'text', text: JSON.stringify(value === undefined ? null : value, null, 2) }]
}

/** 只重试「再来一次可能就好了」的失败；写操作永远不重试。 */
function transient(result) {
  const text = String(result.stderr || '') + '\n' + String(result.stdout || '')
  return /HTTP 5\d\d|502|503|504|gateway|timeout|timed out|ECONNRESET|socket hang up|EAI_AGAIN|ETIMEDOUT/i.test(text)
}
