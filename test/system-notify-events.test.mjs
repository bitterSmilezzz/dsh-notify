import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'

// —— 注入替身必须早于被测模块 import ——
// 同 system-notify-fallback.test.mjs 手法：CJS 内建（node:child_process /
// node:fs）的 ESM 具名导入是活绑定，createRequire 拿到 CJS exports 后直接
// 改写属性即可让被测模块拿到替身。被测模块运行时只依赖 node 内建与
// ./notify-policy.ts，直连 src 走 node 原生 type-stripping。
const require = createRequire(import.meta.url)
const cp = require('node:child_process')
const fs = require('node:fs')

/** 替身 spawn：记录调用并返回可手动触发 exit/error 的 EventEmitter child。 */
const spawned = []
cp.spawn = (cmd, args, opts) => {
  const child = new EventEmitter()
  child.unref = () => {}
  spawned.push({ cmd, args, opts, child })
  return child
}
/** 恒走 osascript 兜底分支：args 形态稳定可断言（[-e, script, '--', title, body]）。 */
fs.existsSync = () => false

const mod = await import('../src/system-notify.ts')
const { applySystemNotify } = mod
const { NOTIFY_EVENTS } = await import('../src/notify-policy.ts')

/** 全开配置（通知是测试主体，不受开关/防重叠干扰）。 */
const fullConfig = {
  enabled: true,
  approval: true,
  turn: true,
  sessionDone: true,
  error: true,
  sound: false,
  overlap: 'auto',
  probeServices: [],
}

/** 假 ctx：只记录 on 注册的 handler；get 恒 undefined（防重叠探测不命中）。 */
function makeHarness() {
  const handlers = new Map()
  const ctx = {
    get: () => undefined,
    on: (event, handler) => { handlers.set(event, handler); return () => handlers.delete(event) },
  }
  return { ctx, handlers }
}

/** 构造最小 agent 载荷（options 即 AgentOptions；session.header 供 isSubagent）。 */
const agent = (id, model, provider) => ({
  id,
  options: { ...(model !== undefined ? { model } : {}), ...(provider !== undefined ? { provider } : {}) },
  session: { header: { origin: 'main' } },
})

/** osascript 兜底分支的 argv：[-e, script, '--', title, body]。 */
const lastBody = () => spawned[spawned.length - 1].args[4]
const lastTitle = () => spawned[spawned.length - 1].args[3]

// ── 通知正文：会话身份（模型名）──

test('turnDone: 正文带模型名（多会话可区分），无模型时回落固定文案', () => {
  spawned.length = 0
  const { ctx, handlers } = makeHarness()
  applySystemNotify(ctx, () => fullConfig, 'http://127.0.0.1:3080')
  handlers.get(NOTIFY_EVENTS.turnDone)({ agent: agent('a1', 'deepseek-chat'), status: 'idle' })
  assert.equal(spawned.length, 1, '轮次完成应发通知')
  assert.equal(lastTitle(), '轮次完成')
  assert.ok(lastBody().includes('deepseek-chat'), '正文含模型名')
  // 无 options 的旧版/畸形 payload：回落固定文案，绝不抛错。
  handlers.get(NOTIFY_EVENTS.turnDone)({ agent: agent('a2'), status: 'idle' })
  assert.equal(spawned.length, 2)
  assert.equal(lastBody(), '该会话已结束一轮，可以切回查看')
})

test('approval/request: waterfall 正常 next() 委托，正文带模型名与工具名', async () => {
  spawned.length = 0
  const { ctx, handlers } = makeHarness()
  applySystemNotify(ctx, () => fullConfig, 'http://127.0.0.1:3080')
  let nexted = 0
  const req = { agent: agent('a1', 'deepseek-chat'), toolName: '执行命令', reason: '删除文件' }
  const out = await handlers.get(NOTIFY_EVENTS.approval)(req, async () => { nexted += 1; return 'allowed-once' })
  assert.equal(out, 'allowed-once', '必须返回 next() 的结果')
  assert.equal(nexted, 1, '观察后必须委托 next()（否则卡死审批链）')
  assert.equal(spawned.length, 1)
  assert.equal(lastTitle(), '需要审批')
  assert.ok(lastBody().includes('deepseek-chat'), '正文含模型名')
  assert.ok(lastBody().includes('执行命令'), '正文含工具名')
  assert.ok(lastBody().includes('删除文件'), '正文含理由')
})

test('sessionDone: 正文带模型名，无模型时回落固定文案', () => {
  spawned.length = 0
  const { ctx, handlers } = makeHarness()
  applySystemNotify(ctx, () => fullConfig, 'http://127.0.0.1:3080')
  handlers.get(NOTIFY_EVENTS.sessionDone)({ agent: agent('a1', 'deepseek-chat') })
  assert.equal(spawned.length, 1)
  assert.equal(lastTitle(), '会话完成')
  assert.ok(lastBody().includes('deepseek-chat'))
  handlers.get(NOTIFY_EVENTS.sessionDone)({ agent: agent('a2') })
  assert.equal(lastBody(), '该会话已完成，可以切回查看')
})

test('error: 正文带模型名 + 错误消息', () => {
  spawned.length = 0
  const { ctx, handlers } = makeHarness()
  applySystemNotify(ctx, () => fullConfig, 'http://127.0.0.1:3080')
  handlers.get(NOTIFY_EVENTS.error)({ agent: agent('a1', 'deepseek-chat'), turn: 1, step: 1, error: new Error('TypeError: x is not a function') })
  assert.equal(spawned.length, 1)
  assert.equal(lastTitle(), 'Agent 出错')
  assert.ok(lastBody().includes('deepseek-chat'), '正文含模型名')
  assert.ok(lastBody().includes('TypeError: x is not a function'), '正文含错误消息')
})

// ── error 去重：消息指纹 ──

test('error 去重: 同 agent 同消息 30s 窗口内只通知一次', () => {
  spawned.length = 0
  const { ctx, handlers } = makeHarness()
  applySystemNotify(ctx, () => fullConfig, 'http://127.0.0.1:3080')
  const emitError = (msg) => handlers.get(NOTIFY_EVENTS.error)({ agent: agent('a1', 'deepseek-chat'), turn: 1, step: 1, error: new Error(msg) })
  emitError('TypeError: x')
  emitError('TypeError: x')
  emitError('TypeError: x')
  assert.equal(spawned.length, 1, '同窗口同错误只通知一次')
})

test('error 去重: 同 agent 不同消息在同一窗口内各自通知（指纹区分内容）', () => {
  spawned.length = 0
  const { ctx, handlers } = makeHarness()
  applySystemNotify(ctx, () => fullConfig, 'http://127.0.0.1:3080')
  const emitError = (msg) => handlers.get(NOTIFY_EVENTS.error)({ agent: agent('a1', 'deepseek-chat'), turn: 1, step: 1, error: new Error(msg) })
  emitError('TypeError: x')
  emitError('ENOENT: no such file')
  emitError('TypeError: x')
  assert.equal(spawned.length, 2, '修复后出现的新错误不被旧去重键吞掉')
  assert.ok(lastBody().includes('ENOENT'), '最后一次通知是新错误')
})

test('error 去重: 不同 agent 的同内容错误各自通知', () => {
  spawned.length = 0
  const { ctx, handlers } = makeHarness()
  applySystemNotify(ctx, () => fullConfig, 'http://127.0.0.1:3080')
  const emitError = (id, msg) => handlers.get(NOTIFY_EVENTS.error)({ agent: agent(id, 'deepseek-chat'), turn: 1, step: 1, error: new Error(msg) })
  emitError('a1', 'TypeError: x')
  emitError('a2', 'TypeError: x')
  assert.equal(spawned.length, 2, 'agent 是去重键的一部分')
})
