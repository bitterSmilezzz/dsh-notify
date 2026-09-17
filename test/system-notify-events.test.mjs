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

const mod = await import('../src/notify-events.ts')
const { applySystemNotify } = mod
const { NOTIFY_EVENTS } = await import('../src/notify-policy.ts')

/** 全开配置（通知是测试主体，不受开关干扰）。 */
const fullConfig = {
  enabled: true,
  approval: true,
  turn: true,
  sessionDone: true,
  error: true,
  sound: false,
}

/**
 * 假 ctx：记录 on 注册的 handler、inject 的 scoped 注册、可注入的 service。
 * @param services - ctx.get(name) 的返回值表（sessionTitle 替身等）。
 * @param describe - ctx.settings.describe() 的返回（locale 偏好等）。
 */
function makeHarness(services = {}, describe = () => []) {
  const handlers = new Map()
  const injections = []
  const ctx = {
    get: (name) => services[name],
    on: (event, handler) => { handlers.set(event, handler); return () => handlers.delete(event) },
    inject: (deps, callback) => { injections.push({ deps, callback }); return {} },
    settings: { describe },
  }
  return { ctx, handlers, injections }
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

// ── 通知正文：会话身份（模型名 / 会话标题）──

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

test('turnDone: 正文优先会话标题（官方 sessionTitle 服务），标题缺失回落模型名', () => {
  spawned.length = 0
  const title = { value: '修复登录 bug' }
  const services = {
    sessionTitle: { get: () => ({ title: title.value }) },
  }
  const { ctx, handlers } = makeHarness(services)
  applySystemNotify(ctx, () => fullConfig, 'http://127.0.0.1:3080')
  handlers.get(NOTIFY_EVENTS.turnDone)({ agent: agent('a1', 'deepseek-chat'), status: 'idle' })
  assert.ok(lastBody().includes('修复登录 bug'), '有会话标题时正文用标题')
  assert.ok(!lastBody().includes('deepseek-chat'), '标题可用时不再拼模型名')
  title.value = ''
  handlers.get(NOTIFY_EVENTS.turnDone)({ agent: agent('a2', 'deepseek-chat'), status: 'idle' })
  assert.ok(lastBody().includes('deepseek-chat'), '空标题回落模型名')
})

test('approval/request: waterfall 正常 next() 委托，正文带会话身份与工具名', async () => {
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

// ── 文案本地化：跟随官方 locale 设置偏好 ──

test('文案本地化: locale.preference = en 时标题与正文用英文；读不到回落中文', () => {
  spawned.length = 0
  const describe = () => [{ ns: 'locale', value: { preference: 'en' } }]
  const { ctx, handlers } = makeHarness({}, describe)
  applySystemNotify(ctx, () => fullConfig, 'http://127.0.0.1:3080')
  handlers.get(NOTIFY_EVENTS.turnDone)({ agent: agent('a1', 'deepseek-chat'), status: 'idle' })
  assert.equal(lastTitle(), 'Turn finished', '英文偏好用英文标题')
  assert.ok(lastBody().includes('deepseek-chat'), '英文正文仍带会话身份')
  assert.ok(lastBody().includes('replied'), '英文正文用英文模板')
  // 另一份 ctx（无 locale namespace）：回落中文。
  const fallback = makeHarness()
  applySystemNotify(fallback.ctx, () => fullConfig, 'http://127.0.0.1:3080')
  fallback.handlers.get(NOTIFY_EVENTS.turnDone)({ agent: agent('a2', 'deepseek-chat'), status: 'idle' })
  assert.equal(lastTitle(), '轮次完成', '无 locale 偏好回落中文')
})

// ── 聚焦抑制：页面可见时抑制非阻塞事件，审批/错误不抑制 ──

/** 假请求：异步可迭代的 body（route handler 用 for-await 读）。 */
function makeReq(method, body) {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))]
  return {
    method,
    async *[Symbol.asyncIterator]() { for (const chunk of chunks) yield chunk },
  }
}

/** 假响应：只记录状态码。 */
function makeRes() {
  const seen = { status: undefined }
  return { seen, res: { writeHead: (status) => { seen.status = status }, end: () => {} } }
}

/**
 * 从 harness 取出聚焦路由并调用一次。
 * 生产路径：scoped inject（connection + webServer）→ ctx.effect(registerPresenceRoute)。
 * @returns 一次 POST 的状态码。
 */
async function postPresence(injections, body, method = 'POST') {
  const injected = injections.find((item) => item.deps.includes('connection') && item.deps.includes('webServer'))
  assert.ok(injected, '必须 scoped inject connection + webServer（注册聚焦路由）')
  const registered = []
  const effects = []
  const connection = { requestRejection: () => undefined }
  const webServer = { register: (route) => { registered.push(route); return () => {} } }
  injected.callback({
    get: (name) => (name === 'connection' ? connection : name === 'webServer' ? webServer : undefined),
    effect: (fn) => { effects.push(fn()); return () => {} },
  })
  assert.equal(registered.length, 1, '注册一条聚焦路由')
  assert.equal(registered[0].path, '/api/dsh-notify/presence', '路由路径与 client 半区一致')
  const { seen, res } = makeRes()
  await registered[0].handler(makeReq(method, body), res)
  return seen.status
}

test('聚焦抑制: 可见时轮次完成/会话完成不发，审批与错误照发', async () => {
  spawned.length = 0
  const { ctx, handlers, injections } = makeHarness()
  applySystemNotify(ctx, () => fullConfig, 'http://127.0.0.1:3080')
  assert.equal(await postPresence(injections, { visible: true }), 204, '合法上报回 204')
  handlers.get(NOTIFY_EVENTS.turnDone)({ agent: agent('a1', 'deepseek-chat'), status: 'idle' })
  handlers.get(NOTIFY_EVENTS.sessionDone)({ agent: agent('a1', 'deepseek-chat') })
  assert.equal(spawned.length, 0, '页面可见时非阻塞事件不打扰')
  handlers.get(NOTIFY_EVENTS.error)({ agent: agent('a1', 'deepseek-chat'), turn: 1, step: 1, error: new Error('boom') })
  assert.equal(spawned.length, 1, '错误不受聚焦抑制（要送达）')
  let nexted = 0
  await handlers.get(NOTIFY_EVENTS.approval)({ agent: agent('a1', 'deepseek-chat'), toolName: '执行命令' }, async () => { nexted += 1 })
  assert.equal(nexted, 1, '审批仍委托 next()')
  assert.equal(spawned.length, 2, '审批不受聚焦抑制（阻塞性）')
})

test('聚焦抑制: 上报 false 后恢复通知；畸形 payload 被拒且不影响状态', async () => {
  spawned.length = 0
  const { ctx, handlers, injections } = makeHarness()
  applySystemNotify(ctx, () => fullConfig, 'http://127.0.0.1:3080')
  assert.equal(await postPresence(injections, { visible: 'yes' }), 400, '畸形 payload 回 400')
  assert.equal(await postPresence(injections, undefined, 'GET'), 405, '非 POST 回 405')
  await postPresence(injections, { visible: true })
  handlers.get(NOTIFY_EVENTS.turnDone)({ agent: agent('a1', 'deepseek-chat'), status: 'idle' })
  assert.equal(spawned.length, 0, '可见状态下抑制')
  await postPresence(injections, { visible: false })
  handlers.get(NOTIFY_EVENTS.turnDone)({ agent: agent('a2', 'deepseek-chat'), status: 'idle' })
  assert.equal(spawned.length, 1, '不可见后恢复通知')
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
