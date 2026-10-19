#!/usr/bin/env node
/**
 * dsh-notify — DSH-Store 准入自检。
 *
 * 逐条实现第三方商城
 * [DSH-Store 目录准入规则](https://github.com/AI-Scarlett/dsh-safe-plugin-manager/blob/main/registry/README.md)
 * 中可由本仓库静态判定的部分，让 `npm run validate:registry` 在提交前就能
 * 给出结论，而不是等商城预检打回。
 *
 * 判据顺序与商城一致：固定源 → manifest 一致 → 入口唯一且不动官方组件 →
 * 生命周期脚本透明 → 命名空间合规 → README 完整 → 权限保守披露。
 *
 * 退出码：0=全部通过；1=存在 FAIL（阻断提交）。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const notes = []

/**
 * 记录一个判据结果。
 * @param {string} label - 判据名。
 * @param {boolean} ok - 是否通过。
 * @param {string} detail - 证据或失败原因。
 * @param {boolean} [blocking] - 失败是否阻断（默认阻断）。
 */
function check(label, ok, detail, blocking = true) {
  if (ok) {
    notes.push(`  [PASS] ${label} — ${detail}`)
    return
  }
  if (blocking) failures.push(`${label} — ${detail}`)
  notes.push(`  [${blocking ? 'FAIL' : 'WARN'}] ${label} — ${detail}`)
}

/** 读取仓库内文本文件。 */
function readText(relative) {
  return existsSync(join(root, relative)) ? readFileSync(join(root, relative), 'utf8') : ''
}

/**
 * 跑一条 git 命令。
 * @param {string[]} args - git 参数。
 * @returns {string} 去掉首尾空白的 stdout；命令失败时返回空串。
 */
function git(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    // 非 git 环境（源码压缩包）或命令不适用：调用方按“无法验证”处理。
    return ''
  }
}

const pkg = JSON.parse(readText('package.json'))
const readme = readText('README.md')
const patchText = readText(pkg.dsh?.bundle?.patch ?? '')

// ── 1. 固定源：公开 GitHub 仓库 + 40 位 commit ──────────────────────────────
const repoUrl = pkg.repository?.url ?? ''
// npm 的 repository.url 惯例是 `git+https://…​.git`；商城要的是去掉前缀与
// `.git` 后的规范地址，两种写法都接受。
const canonicalRepo = repoUrl.replace(/^git\+/u, '').replace(/\.git$/u, '')
check('repositoryUrl 为公开 GitHub 仓库', /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/u.test(canonicalRepo), canonicalRepo || '缺失')

const head = git(['rev-parse', 'HEAD'])
check('HEAD 为 40 位不可变 commit', /^[0-9a-f]{40}$/u.test(head), head || '无法读取（非 git 环境）')

// ── 2. manifest 一致：version 与该 commit 的 tag 对齐 ───────────────────────
const tagsAtHead = git(['tag', '--points-at', 'HEAD']).split('\n').filter(Boolean)
const expectedTag = `v${pkg.version}`
check('version 与当前 commit 的 tag 一致', tagsAtHead.includes(expectedTag),
  tagsAtHead.length ? `HEAD 上的 tag：${tagsAtHead.join(', ')}（期望 ${expectedTag}）` : `HEAD 上没有 tag（期望 ${expectedTag}）`)

// ── 3. bundle patch：声明存在且可解析 ───────────────────────────────────────
check('声明 dsh.bundle.patch', typeof pkg.dsh?.bundle?.patch === 'string' && pkg.dsh.bundle.patch.length > 0, pkg.dsh?.bundle?.patch ?? '缺失')
check('cordis.patch.yml 存在且非空', patchText.length > 0, pkg.dsh?.bundle?.patch ?? '')

/** Bundle Patch 插入的 entry id（顶层与 insert 块内的 `- id:` 都算）。 */
const entryIds = [...patchText.matchAll(/^\s*-\s*id:\s*([\w.@/-]+)\s*$/gmu)].map(m => m[1])
check('Bundle Patch 至少插入一个入口', entryIds.length > 0, entryIds.join(', ') || '未解析到 entry id')
check('入口 ID 唯一', new Set(entryIds).size === entryIds.length, entryIds.join(', '))

// ── 4. 不动官方组件：不禁用 / 替换 / 重复安装 @deepseek-ai/* ────────────────
/**
 * 找出 `disabled: true` 所属的 entry id：向上回溯最近的一个 `- id:`。
 * @param {string} text - patch 全文。
 * @returns {string[]} 被禁用的 id 列表。
 */
function disabledEntryIds(text) {
  const lines = text.split('\n')
  const disabled = []
  let currentId
  for (const line of lines) {
    const idMatch = /^\s*-\s*id:\s*([\w.@/-]+)\s*$/u.exec(line)
    if (idMatch) currentId = idMatch[1]
    if (/^\s*disabled:\s*true\s*$/u.test(line) && currentId) disabled.push(currentId)
  }
  return disabled
}

const disabled = disabledEntryIds(patchText)
check('未禁用任何 entry（含官方组件）', disabled.length === 0, disabled.length ? `被禁用：${disabled.join(', ')}` : '无 disabled: true')

const ownName = pkg.name
const forbiddenNs = /^@deepseek-ai\//u.test(ownName)
check('不使用 @deepseek-ai/* 命名空间', !forbiddenNs, ownName)
check('Bundle 入口名为本包自身', patchText.includes(ownName) || entryIds.length === 0, ownName)

// ── 5. 生命周期脚本透明 ────────────────────────────────────────────────────
const lifecycle = ['preinstall', 'install', 'postinstall', 'prepare'].filter(name => typeof pkg.scripts?.[name] === 'string')
check('生命周期脚本已明确（无则明示）', lifecycle.length === 0,
  lifecycle.length ? `存在：${lifecycle.join(', ')}` : '无 preinstall/install/postinstall/prepare')
check('README 声明无生命周期脚本', /生命周期脚本[:：]\s*\*\*无\*\*|no lifecycle scripts/iu.test(readme), 'README 分节声明')

// ── 6. README 完整：用途 / 安装 / 外部依赖 / 权限 / 已知风险 ────────────────
check('README 说明用途', /^#\s+\S/mu.test(readme) && readme.length > 500, `${readme.length} 字符`)
check('README 说明安装方式', /dsh plugin/u.test(readme), '含 `dsh plugin … add` 命令')
check('README 说明外部依赖', /外部依赖/u.test(readme), '「外部依赖」分节')
check('README 说明已知风险', /已知风险/u.test(readme), '「已知风险」分节')
check('README 披露权限等级', /\b(low|medium|high|unknown)\b/u.test(readme), (/\b(low|medium|high|unknown)\b/u.exec(readme) ?? [''])[0])

// ── 7. 依赖克制：官方包声明为 peer 而非 dependencies ────────────────────────
const depNames = Object.keys(pkg.dependencies ?? {}).filter(name => name.startsWith('@deepseek-ai/'))
check('官方 @deepseek-ai/* 包不作为 dependencies', depNames.length === 0,
  depNames.length ? `应改为 peerDependencies：${depNames.join(', ')}` : '零 dependencies')
check('运行时依赖为空', Object.keys(pkg.dependencies ?? {}).length === 0,
  Object.keys(pkg.dependencies ?? {}).join(', ') || '无运行时依赖')

// ── 8. 兼容性声明 ──────────────────────────────────────────────────────────
check('声明 Node engines', typeof pkg.engines?.node === 'string' && pkg.engines.node.length > 0, pkg.engines?.node ?? '缺失')
// `engines.dsh` 是宿主自己的判据：存在时 peerDependencies 被忽略（见
// dsh-app-boot 的 unmetRequirements）。缺了它，市场卡片只能靠 peer 猜兼容性。
check('声明 engines.dsh（宿主版本要求）', typeof pkg.engines?.dsh === 'string' && pkg.engines.dsh.length > 0,
  pkg.engines?.dsh ?? '缺失（市场只能靠 peer 推断兼容性）')
check('声明 license', typeof pkg.license === 'string' && pkg.license.length > 0, pkg.license ?? '缺失')

// ── 汇总 ──────────────────────────────────────────────────────────────────
process.stdout.write(`DSH-Store 准入自检：${pkg.name}@${pkg.version}\n${notes.join('\n')}\n\n`)
if (failures.length > 0) {
  process.stdout.write(`结果：${notes.length - failures.length}/${notes.length} 通过，${failures.length} 项阻断：\n${failures.map(f => `  - ${f}`).join('\n')}\n`)
  process.exit(1)
}
process.stdout.write(`结果：${notes.length}/${notes.length} 通过，可以提交 DSH-Store。\n`)
