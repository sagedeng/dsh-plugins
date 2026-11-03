# GitHub Operations

给对话加上一组 GitHub 工具：**看 → 改 → 发 → 评审 → 追 CI / issue**。不绑定任何仓库，目标由参数 `repo`（`owner/name`）或当前会话工作区决定。

## 工具

| 工具 | 类型 | 作用 |
|---|---|---|
| `github_status` | 读 | gh 登录身份 + 工作区仓库状态（分支、ahead/behind、未提交文件、最后提交、remote）+ 仓库元数据（可见性、默认分支、star） |
| `github_pr_list` | 读 | PR 列表：作者、草稿、可合并性、评审结论、改动量、CI 汇总 |
| `github_pr_view` | 读 | 单个 PR 详情：描述、分支、改动文件、commits、reviews、checks |
| `github_checks` | 读 | 某个 PR 或某个 ref 的 CI 明细，附失败 job 名 |
| `github_issue_list` | 读 | issue 列表，带标签、作者、状态 |
| `github_repo_create` | 写 | 从本地目录建仓库，可选推送 |
| `github_commit_push` | 写 | 暂存 + 提交 + 推送（永不 force） |
| `github_pr_create` | 写 | 开 PR，返回编号与 URL |
| `github_pr_review` | 写 | 提交评审：comment / approve / request-changes |
| `github_issue_create` | 写 | 开 issue，可带标签与指派 |

读工具标记为可并发；写工具串行。

## 认证

复用本机 **`gh` CLI 的登录态**（`gh auth login`），插件自己不经手、不存储任何 token。`gh` 不在 PATH 或未登录时，工具会直接给出可执行的诊断，而不是模糊失败。

## 写操作的闸门

每个写工具在真正调用 `gh` 之前请求一次审批：

- 会话策略 `ask`（默认）→ 弹审批，用户点允许才执行；审批结果与理由记进会话审计日志。
- 会话策略 `never`（无人值守/CI）→ **直接拒绝**，fail closed。
- profile 未挂载 approval 服务 → 同样拒绝。

也就是说，写工具不会绕过你的权限策略。想彻底关掉这道闸（不建议），在 `cordis.patch.yml` 里设 `requireApproval: false`。

## 配置

```yaml
- id: github-ops
  name: '@local/dsh-github-ops'
  config:
    ghPath: gh              # gh 可执行文件
    gitPath: git
    timeoutMs: 60000        # 读操作超时
    writeTimeoutMs: 180000  # 写操作超时
    requireApproval: true   # 写操作审批
    defaultRemote: origin
    maxBodyChars: 4000      # PR/issue 正文回传上限（超出截断）
```

## 边界

- 依赖本机 `gh` 与 `git`，两者都通过 `execFile` 直接调用（不经 shell），参数逐个传递，没有拼接注入面。
- 不做 force push、不删仓库、不改权限、不管理 secrets —— 需要这些时用 `gh` 手工或 bash 工具，别把破坏性能力塞进模型工具。
- 列表类工具会在源头裁剪（文件 100 条、commits 最近 20 条、正文 `maxBodyChars`），避免把大 JSON 灌进上下文。
- 服务端限流与 SSO 授权由 `gh` 负责，工具只透传它的错误信息。
- 读工具遇到瞬时失败（HTTP 5xx / 网关超时 / 连接重置）会重试一次；写工具**永不重试**，避免重复建 PR、重复提交这类副作用。

## 典型用法

```
用户：看看这个仓库现在什么状态
→ github_status

用户：把改动提交并推上去，然后开个 PR
→ github_commit_push { message, push: true }
→ github_pr_create { title, body, draft: false }

用户：review 一下 #42
→ github_pr_view { number: 42 }
→ github_pr_review { number: 42, action: 'comment', body: '…' }
```
