import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'

// —— 注入替身必须早于被测模块 import ——
// node:test 的 mock.module 在 Node 26 已移除、mock.method 无法重定义内建
// 模块命名空间，但 CJS 内建（node:child_process / node:fs）的 ESM 具名导入
// 是活绑定：createRequire 拿到 CJS exports 后直接改写属性即可让被测模块
// 拿到替身（实测生效）。被测模块运行时只依赖 node 内建与 ./notify-policy.ts，
// 直连 src 走 node 原生 type-stripping（与 system-notify.test.mjs 同法）。
const require = createRequire(import.meta.url)
const cp = require('node:child_process')
const fs = require('node:fs')

/** 替身 spawn：记录调用并返回可手动触发 exit/error 的 EventEmitter child。 */
const spawned = []
cp.spawn = (cmd, args, opts) => {
  const child = new EventEmitter()
  child.unref = () => {} // 生产 child 的 unref 面（spawn 后立即调用，缺了会走同步兜底）
  spawned.push({ cmd, args, opts, child })
  return child
}
/** 只承认 Apple Silicon 路径存在：钉住 terminal-notifier 分支，不依赖本机。 */
fs.existsSync = (p) => p === '/opt/homebrew/bin/terminal-notifier'

const mod = await import('../src/system-notify.ts')
const { notifyMac, OSASCRIPT_NOTIFY, OSASCRIPT_NOTIFY_DEFAULT_SOUND } = mod

const terminalSpawns = () => spawned.filter((s) => s.cmd === '/opt/homebrew/bin/terminal-notifier')
const osascriptSpawns = () => spawned.filter((s) => s.cmd === 'osascript')

test('exit 非 0（macOS 26 点击 API 失效）→ osascript 兜底一次；exit+error 双触发不双发', () => {
  spawned.length = 0
  notifyMac('标题', '正文', 'https://example.com/s', true)
  assert.equal(terminalSpawns().length, 1, '存在 terminal-notifier 时走可点击跳转分支')
  const { args, child } = terminalSpawns()[0]
  assert.deepEqual(args, ['-message', '正文', '-title', '标题', '-open', 'https://example.com/s', '-sound', 'Glass'])

  // 运行期失败：exit code 非 0 → 必须触发 osascript 兜底（通知不静默丢失）。
  child.emit('exit', 1, null)
  assert.equal(osascriptSpawns().length, 1, 'exit 非 0 必须触发 osascript 兜底')
  assert.deepEqual(osascriptSpawns()[0].args, ['-e', OSASCRIPT_NOTIFY, '--', '标题', '正文'], '兜底走 argv 传负载的 osascript')

  // 防双发：紧随其后的 error（exec 失败通道）不得再兜底一次。
  child.emit('error', new Error('boom'))
  assert.equal(osascriptSpawns().length, 1, 'exit 已兜底，error 不得双发')
})

test('error（exec 失败）→ osascript 兜底一次；随后 exit 非 0 不双发', () => {
  spawned.length = 0
  notifyMac('t', 'b', 'https://example.com/s', false)
  const { child } = terminalSpawns()[0]

  child.emit('error', new Error('spawn failed'))
  assert.equal(osascriptSpawns().length, 1, 'exec 失败必须触发 osascript 兜底')
  assert.deepEqual(osascriptSpawns()[0].args, ['-e', OSASCRIPT_NOTIFY_DEFAULT_SOUND, '--', 't', 'b'], 'sound=false 走系统默认音变体')

  // 防双发：紧随其后的 exit 非 0 不得再兜底一次。
  child.emit('exit', 1, null)
  assert.equal(osascriptSpawns().length, 1, 'error 已兜底，exit 不得双发')
})

test('exit 0（成功发送）→ 不触发 osascript 兜底', () => {
  spawned.length = 0
  notifyMac('t', 'b', 'https://example.com/s', true)
  terminalSpawns()[0].child.emit('exit', 0, null)
  assert.equal(osascriptSpawns().length, 0, '成功发送后不得再弹一条重复通知')
})

test('无 openUrl（不可点击）→ 直接 osascript，不 spawn terminal-notifier', () => {
  spawned.length = 0
  notifyMac('t', 'b', undefined, true)
  assert.equal(terminalSpawns().length, 0, '无跳转目标时不需要 terminal-notifier')
  assert.equal(osascriptSpawns().length, 1)
})
