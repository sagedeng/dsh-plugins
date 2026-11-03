#!/usr/bin/env node
/**
 * 静态自检：不需要 DSH 在跑，也不碰 ~/.dsh。
 *
 *   node scripts/check.mjs
 *
 * 对 plugins.json 里的每个插件检查：目录/清单、exports 与 files 指向的文件、
 * 图标格式与大小、双语 locale 元数据、每个 .js 的语法、主入口能否被 ESM 导入并
 * 导出 apply。任何一项失败 → 退出码 1。
 */
import { readFile, readdir, stat } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const problems = []
const lines = []

function fail(plugin, message) {
  problems.push(`${plugin}: ${message}`)
}

function ok(plugin, message) {
  lines.push(`  ok    ${message}`)
}

/** 极简 glob：只支持单段内的 `*`，足够覆盖 `locale/*.json` 这类写法。 */
async function globExists(pattern) {
  if (!pattern.includes('*')) return existsSync(path.join(root, pattern))
  const dir = path.dirname(pattern)
  const base = path.basename(pattern)
  const rx = new RegExp('^' + base.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$')
  try {
    const entries = await readdir(path.join(root, dir))
    return entries.some((entry) => rx.test(entry))
  } catch {
    return false
  }
}

async function globList(pattern) {
  const dir = path.dirname(pattern)
  const base = path.basename(pattern)
  const rx = new RegExp('^' + base.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$')
  try {
    const entries = await readdir(path.join(root, dir))
    return entries.filter((entry) => rx.test(entry)).map((entry) => path.join(dir, entry))
  } catch {
    return []
  }
}

function run(args) {
  try {
    execFileSync(args[0], args.slice(1), { stdio: 'pipe', timeout: 20000 })
    return null
  } catch (error) {
    return String((error && (error.stderr || error.stdout || error.message)) || error).trim().split('\n').slice(0, 3).join(' | ')
  }
}

const manifest = JSON.parse(await readFile(path.join(root, 'plugins.json'), 'utf8'))
for (const plugin of manifest.plugins) {
  lines.push(`${plugin.id}  (${plugin.package}@${plugin.version})`)
  const dir = path.join(root, plugin.dir)

  if (!existsSync(dir)) {
    fail(plugin.id, `目录不存在：${plugin.dir}`)
    continue
  }
  ok(plugin.id, `目录 ${plugin.dir}`)

  let pkg
  try {
    pkg = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'))
  } catch (error) {
    fail(plugin.id, `package.json 读不了：${error.message}`)
    continue
  }
  if (pkg.name !== plugin.package) fail(plugin.id, `name 不一致：清单 ${plugin.package} / 实际 ${pkg.name}`)
  if (pkg.version !== plugin.version) fail(plugin.id, `version 不一致：清单 ${plugin.version} / 实际 ${pkg.version}`)
  if (!pkg.dsh || !pkg.dsh.bundle || !pkg.dsh.bundle.patch) fail(plugin.id, '缺少 dsh.bundle.patch')
  else if (!existsSync(path.join(dir, pkg.dsh.bundle.patch))) fail(plugin.id, `patch 不存在：${pkg.dsh.bundle.patch}`)

  for (const [key, target] of Object.entries(pkg.exports || {})) {
    if (target.includes('*')) continue
    if (!existsSync(path.join(dir, target))) fail(plugin.id, `exports["${key}"] 指向不存在的 ${target}`)
  }

  const runtimeFiles = []
  for (const entry of pkg.files || []) {
    if (entry.includes('*')) {
      const found = await globList(path.join(plugin.dir, entry))
      if (!found.length) fail(plugin.id, `files 里 ${entry} 一个都没匹配到`)
      runtimeFiles.push(...found)
    } else {
      if (!existsSync(path.join(dir, entry))) fail(plugin.id, `files 里 ${entry} 不存在`)
      if (entry.endsWith('.js')) runtimeFiles.push(path.join(plugin.dir, entry))
    }
  }
  ok(plugin.id, `exports / files 指向的文件都在（${(pkg.files || []).length} 条）`)

  // 图标
  const iconPath = pkg.icon
    ? path.join(dir, pkg.icon)
    : pkg.exports && pkg.exports['./icon'] && !pkg.exports['./icon'].includes('*')
      ? path.join(dir, pkg.exports['./icon'])
      : null
  if (!iconPath) fail(plugin.id, '没有导出 ./icon')
  else if (!existsSync(iconPath)) fail(plugin.id, `图标不存在：${iconPath}`)
  else {
    const { size } = await stat(iconPath)
    const head = (await readFile(iconPath)).subarray(0, 16)
    const svg = head.toString('utf8').trimStart().startsWith('<')
    const png = head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    const jpeg = head[0] === 0xff && head[1] === 0xd8
    const webp = head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP'
    if (!(svg || png || jpeg || webp)) fail(plugin.id, '图标不是 SVG/PNG/JPEG/WebP')
    if (size > 256 * 1024) fail(plugin.id, `图标 ${size} 字节，超过 256 KiB`)
    if (svg || png) ok(plugin.id, `图标 ${path.basename(iconPath)} ${size} 字节`)
  }

  // 双语 locale 元数据
  const localeFiles = (pkg.files || [])
    .filter((entry) => entry.includes('locale/'))
    .flatMap((entry) => (entry.includes('*') ? [] : [entry]))
  const locales = localeFiles.length
    ? localeFiles
    : (await globList(path.join(plugin.dir, 'locale/*.json')))
  if (!locales.length) fail(plugin.id, '没有 locale 文件')
  for (const rel of locales) {
    try {
      const dict = JSON.parse(await readFile(path.join(dir, path.relative(plugin.dir, rel) || rel), 'utf8'))
      const meta = dict.meta || {}
      if (!meta.title || !meta.description) fail(plugin.id, `${rel} 缺少 meta.title 或 meta.description`)
    } catch (error) {
      fail(plugin.id, `${rel} 解析失败：${error.message}`)
    }
  }
  if (locales.length) ok(plugin.id, `locale ${locales.length} 份，meta 齐全`)

  // 语法
  for (const rel of [...new Set(runtimeFiles)]) {
    if (!rel.endsWith('.js')) continue
    const error = run(['node', '--check', path.join(root, rel)])
    if (error) fail(plugin.id, `${rel} 语法错误：${error}`)
  }
  ok(plugin.id, `语法 ${runtimeFiles.filter((f) => f.endsWith('.js')).length} 个 js 文件`)

  // 主入口能在独立进程里被导入，且导出 apply
  const main = pkg.exports && typeof pkg.exports['.'] === 'string' ? pkg.exports['.'] : null
  if (main) {
    const url = pathToFileURL(path.join(dir, main)).href
    const script = `import(${JSON.stringify(url)}).then(m=>{if(typeof m.apply!=='function'){console.error('无 apply 导出');process.exit(3)}}).catch(e=>{console.error(e.message);process.exit(4)})`
    const error = run(['node', '-e', script])
    if (error) fail(plugin.id, `主入口导入失败：${error}`)
    else ok(plugin.id, `主入口 ${main} 可导入且导出 apply`)
  }
}

if (problems.length) {
  console.log(lines.join('\n'))
  console.log('\n失败项：')
  for (const problem of problems) console.log('  FAIL  ' + problem)
  process.exit(1)
}
console.log(lines.join('\n'))
console.log(`\n全部通过：${manifest.plugins.length} 个插件`)
