import { test } from 'node:test'
import assert from 'node:assert/strict'

// 直连 src（node 26 原生 type-stripping；本模块运行时只依赖 node 内建与
// ./notify-policy.ts，不需要 relink 的 node_modules）。
import { existsSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const mod = await import('../src/system-notify.ts')
const { OSASCRIPT_NOTIFY, OSASCRIPT_NOTIFY_DEFAULT_SOUND, POWERSHELL_TOAST_PS1, pruneStalePs1Scripts, psNamedArgs } = mod

test('AppleScript 模板：标题/正文经 argv 传入（on run argv），脚本本体零插值', () => {
  for (const script of [OSASCRIPT_NOTIFY, OSASCRIPT_NOTIFY_DEFAULT_SOUND]) {
    assert.ok(script.includes('on run argv'), '必须以 on run argv 接收负载')
    assert.ok(script.includes('title (item 1 of argv)'), '标题必须取 argv 第 1 项')
    assert.ok(script.includes('notification (item 2 of argv)'), '正文必须取 argv 第 2 项')
    assert.ok(!script.includes('${'), '脚本体禁止 JS 模板插值（注入约束）')
    assert.ok(!script.includes("' + "), '脚本体禁止字符串拼接（注入约束）')
  }
})

test('AppleScript sound 变体：显式 Glass 与系统默认音之差', () => {
  assert.ok(OSASCRIPT_NOTIFY.includes('sound name "Glass"'), 'sound=true 走显式 Glass')
  assert.ok(!OSASCRIPT_NOTIFY_DEFAULT_SOUND.includes('sound name'), 'sound=false 不带 sound 子句')
})

test('PowerShell toast 脚本：静态 -File 脚本，负载经命名参数 + SecurityElement.Escape', () => {
  assert.ok(POWERSHELL_TOAST_PS1.includes('param([string]$Title, [string]$Body, [string]$OpenUrl)'), '负载必须经命名参数进入')
  assert.ok(POWERSHELL_TOAST_PS1.includes('[System.Security.SecurityElement]::Escape'), 'XML 负载必须经 SecurityElement.Escape')
  assert.ok(!POWERSHELL_TOAST_PS1.includes('${'), '脚本体禁止 JS 模板插值（用户数据不进命令行）')
  // JS 侧给 `-` 前缀值加的装饰性前导空格必须在脚本内 TrimStart 掉，toast 展示才无前导空格
  // （spawn 不走 shell，argv 空格会原样到达 PowerShell 绑定器，只能脚本侧清）。
  assert.ok(POWERSHELL_TOAST_PS1.includes('$Title.TrimStart()'), '标题必须 TrimStart 掉装饰性前导空格')
  assert.ok(POWERSHELL_TOAST_PS1.includes('$Body.TrimStart()'), '正文必须 TrimStart 掉装饰性前导空格')
})

test('psNamedArgs: 以 - 开头的值加前导空格，避免被 PowerShell 误解析为参数名', () => {
  // 参数形态保持 `-Name value` 分离（含空格值由 spawn 引号处理）；
  // 值以 `-` 开头时前插空格，绑定器不再把它当参数名。
  assert.deepEqual(psNamedArgs('-foo', 'normal body'), ['-Title', ' -foo', '-Body', 'normal body'])
  assert.deepEqual(psNamedArgs('正常标题', '-foo'), ['-Title', '正常标题', '-Body', ' -foo'])
  // 不以 - 开头的值原样传递（不引入多余空格）。
  assert.deepEqual(psNamedArgs('hello', 'world'), ['-Title', 'hello', '-Body', 'world'])
  // openUrl 非空才追加；空串不追加。
  assert.deepEqual(psNamedArgs('t', 'b', 'https://x'), ['-Title', 't', '-Body', 'b', '-OpenUrl', 'https://x'])
  assert.deepEqual(psNamedArgs('t', 'b', ''), ['-Title', 't', '-Body', 'b'])
  assert.deepEqual(psNamedArgs('t', 'b', undefined), ['-Title', 't', '-Body', 'b'])
  // 前缀空格只加在最前：中间的空格/引号原样保留。
  assert.deepEqual(psNamedArgs('-a b', 'c'), ['-Title', ' -a b', '-Body', 'c'])
})

test('pruneStalePs1Scripts: 只删超龄的 dsh-notify-*.ps1，保留新文件与无关文件', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-notify-test-'))
  try {
    const old = join(dir, 'dsh-notify-old.ps1')
    const fresh = join(dir, 'dsh-notify-fresh.ps1')
    const unrelated = join(dir, 'other.ps1')
    writeFileSync(old, '# stale')
    writeFileSync(fresh, '# fresh')
    writeFileSync(unrelated, '# unrelated')
    const now = Date.now()
    utimesSync(old, new Date(now - 120_000), new Date(now - 120_000)) // 2 分钟前
    utimesSync(fresh, new Date(now - 1000), new Date(now - 1000))     // 1 秒前

    const removed = pruneStalePs1Scripts(dir, now, 60_000)

    assert.equal(removed, 1)
    assert.ok(!existsSync(old), '超龄残留已删')
    assert.ok(existsSync(fresh), '新文件保留')
    assert.ok(existsSync(unrelated), '无关文件保留')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('pruneStalePs1Scripts: 目录不存在 / 不可读时静默返回 0', () => {
  const gone = join(tmpdir(), `dsh-notify-missing-${Date.now()}`)
  assert.equal(pruneStalePs1Scripts(gone, Date.now(), 60_000), 0)
})
