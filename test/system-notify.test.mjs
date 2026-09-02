import { test } from 'node:test'
import assert from 'node:assert/strict'

// 直连 src（node 26 原生 type-stripping；本模块运行时只依赖 node 内建与
// ./notify-policy.ts，不需要 relink 的 node_modules）。
const mod = await import('../src/system-notify.ts')
const { OSASCRIPT_NOTIFY, OSASCRIPT_NOTIFY_DEFAULT_SOUND, POWERSHELL_TOAST_PS1 } = mod

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
})
