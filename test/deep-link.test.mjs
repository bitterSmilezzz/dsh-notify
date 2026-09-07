import { test } from 'node:test'
import assert from 'node:assert/strict'

// 直连 src（node 26 原生 type-stripping；本模块只依赖 node 内建与类型擦除）。
const mod = await import('../src/client/deep-link.ts')
const { sessionIdFromLocation, applySessionDeepLink } = mod

test('deep-link 解析：优先 #session= fragment（rc.1 token 鉴权新形态）', () => {
  // token 交换后浏览器落在 `/`，fragment 被 303 重定向保留。
  assert.equal(sessionIdFromLocation('', '#session=abc123'), 'abc123')
  assert.equal(sessionIdFromLocation('?token=t1', '#session=abc123'), 'abc123')
  // fragment 带额外参数时仍能取到 session。
  assert.equal(sessionIdFromLocation('', '#session=abc123&from=notify'), 'abc123')
})

test('deep-link 解析：回落 ?session= 查询参数（旧形态）', () => {
  assert.equal(sessionIdFromLocation('?session=old-id', ''), 'old-id')
  // 旧形态与新形态并存时 fragment 优先。
  assert.equal(sessionIdFromLocation('?session=old-id', '#session=new-id'), 'new-id')
})

test('deep-link 解析：两者皆缺失或为空返回 null', () => {
  assert.equal(sessionIdFromLocation('', ''), null)
  assert.equal(sessionIdFromLocation('?token=t1', ''), null)
  assert.equal(sessionIdFromLocation('?session=', '#session='), null)
  assert.equal(sessionIdFromLocation('?foo=bar', '#baz=qux'), null)
})

test('deep-link 解析：特殊字符经 URL 编码往返一致', () => {
  // sessionId 可能含空格/加号/中文等，host 侧 encodeURIComponent 编码进 hash，
  // URLSearchParams 解析时解码回原值——往返必须一致。
  for (const id of ['a b', 'a+b', 'a&b', '中文会话', 'a#b', 'a/b?c=1']) {
    const encoded = encodeURIComponent(id)
    assert.equal(sessionIdFromLocation('', `#session=${encoded}`), id, id)
    assert.equal(sessionIdFromLocation(`?session=${encoded}`, ''), id, id)
  }
})

// ── applySessionDeepLink（effect 流程；假 window + 假 ctx）──
// deep-link 读全局 window（setTimeout/location/history/addEventListener），
// 测试注入假对象并在 finally 恢复；ctx 只暴露 effect/get 两个面。

function setupFake(sessions, initialLocation = { search: '?token=t1', hash: '#session=abc', href: 'http://127.0.0.1:3080/?token=t1#session=abc' }) {
  const calls = { timers: [], cleared: 0, replaceState: 0, listeners: [], warns: [] }
  let timerId = 0
  const win = {
    location: { ...initialLocation },
    history: { replaceState: () => { calls.replaceState += 1 } },
    setTimeout: (fn) => { calls.timers.push(fn); return ++timerId },
    clearTimeout: () => { calls.cleared += 1 },
    addEventListener: (type, fn) => { calls.listeners.push({ type, fn }) },
    removeEventListener: (type, fn) => {
      calls.listeners = calls.listeners.filter((l) => !(l.type === type && l.fn === fn))
    },
  }
  const savedWindow = globalThis.window
  const savedClearTimeout = globalThis.clearTimeout
  const savedWarn = globalThis.console.warn
  globalThis.window = win
  // 源码里 `window.setTimeout` 与裸 `clearTimeout` 混用（浏览器里同一对象）；
  // node 里裸 clearTimeout 是独立全局，须一并替换才能记录。
  globalThis.clearTimeout = () => { calls.cleared += 1 }
  // 超时/失败的可见提示走 console.warn（client 无 toast），测试捕获并断言。
  globalThis.console.warn = (msg) => { calls.warns.push(String(msg)) }
  let disposer = null
  const ctx = {
    effect: (fn) => { disposer = fn(); return disposer },
    get: (name) => name === 'sessions' ? sessions : undefined,
  }
  return {
    calls,
    ctx,
    win,
    runTimer: () => { const fn = calls.timers.shift(); if (fn) fn() },
    emitHashchange: () => { for (const l of [...calls.listeners]) if (l.type === 'hashchange') l.fn() },
    dispose: () => disposer(),
    restore: () => {
      if (savedWindow === undefined) delete globalThis.window
      else globalThis.window = savedWindow
      globalThis.clearTimeout = savedClearTimeout
      globalThis.console.warn = savedWarn
    },
  }
}

test('applySessionDeepLink: subscribe 同步抛错不炸 fiber，timer 回调不踩 TDZ，URL 保留', () => {
  const s = setupFake({
    open() {},
    list: {
      subscribe() { throw new Error('subscribe failed') },
      getSnapshot: () => ({ byId: {} }),
    },
  })
  try {
    // subscribe 抛错前 timer 已注册、unsub 尚未赋值——apply 必须把异常吞掉。
    assert.doesNotThrow(() => applySessionDeepLink(s.ctx))
    assert.equal(s.calls.timers.length, 1, 'timer 已注册')
    // 触发 timer 回调：unsub 未赋值必须安全跳过（TDZ 防御），且不清理 URL
    //（与 sessions 缺失一致：保留痕迹，刷新可重试）。
    assert.doesNotThrow(() => s.runTimer())
    assert.equal(s.calls.replaceState, 0, '不清理 URL')
    // 订阅失败给出可见提示（console.warn），不再静默放弃。
    assert.equal(s.calls.warns.length, 1, '订阅失败有 console 提示')
    assert.ok(s.calls.warns[0].includes('刷新可重试'), '提示含重试指引')
    // effect 清理函数同样安全（catch 分支已清 timer，返回空清理）。
    assert.doesNotThrow(() => s.dispose())
    assert.equal(s.calls.cleared, 1, 'catch 分支清掉 timer')
    assert.equal(s.calls.listeners.filter((l) => l.type === 'hashchange').length, 0, 'dispose 移除 hashchange 监听')
  } finally {
    s.restore()
  }
})

test('applySessionDeepLink: 会话未出现时超时后 unsub、console 提示并保留 URL', () => {
  let unsubbed = 0
  const s = setupFake({
    open() {},
    list: {
      subscribe: () => () => { unsubbed += 1 },
      getSnapshot: () => ({ byId: {} }),
    },
  })
  try {
    applySessionDeepLink(s.ctx)
    assert.equal(s.calls.timers.length, 1)
    s.runTimer()
    assert.equal(unsubbed, 1, '超时后解除订阅')
    assert.equal(s.calls.replaceState, 0, '超时放弃后保留 URL（不清痕迹，刷新可重试）')
    assert.equal(s.calls.warns.length, 1, '超时放弃有 console 提示')
    assert.ok(s.calls.warns[0].includes('15s'), '提示含超时时长')
    assert.doesNotThrow(() => s.dispose())
  } finally {
    s.restore()
  }
})

test('applySessionDeepLink: 快照已含会话时立即打开并清理 URL，不注册 timer', () => {
  let opened = null
  const s = setupFake({
    open: (sid) => { opened = sid },
    list: {
      subscribe() { throw new Error('快照已命中不应订阅') },
      getSnapshot: () => ({ byId: { abc: {} } }),
    },
  })
  try {
    applySessionDeepLink(s.ctx)
    assert.equal(opened, 'abc')
    assert.equal(s.calls.replaceState, 1, '跳转后清理 URL')
    assert.equal(s.calls.timers.length, 0, '不注册超时 timer')
    assert.doesNotThrow(() => s.dispose())
  } finally {
    s.restore()
  }
})

test('applySessionDeepLink: sessions 服务缺失时安全退出（不注册 timer、不清理 URL）', () => {
  const s = setupFake(undefined)
  try {
    assert.doesNotThrow(() => applySessionDeepLink(s.ctx))
    assert.equal(s.calls.timers.length, 0)
    assert.equal(s.calls.replaceState, 0, 'URL 保留供下次加载重试')
    assert.doesNotThrow(() => s.dispose())
  } finally {
    s.restore()
  }
})

test('applySessionDeepLink: open 抛错时保留 URL 并 console 提示（不静默落首页）', () => {
  const s = setupFake({
    open() { throw new Error('session destroyed') },
    list: {
      subscribe() { throw new Error('快照已命中不应订阅') },
      getSnapshot: () => ({ byId: { abc: {} } }),
    },
  })
  try {
    applySessionDeepLink(s.ctx)
    assert.equal(s.calls.replaceState, 0, 'open 失败不清 URL，保留痕迹可重试')
    assert.equal(s.calls.warns.length, 1, 'open 失败有 console 提示')
    assert.ok(s.calls.warns[0].includes('打开失败'), '提示说明失败原因')
    assert.doesNotThrow(() => s.dispose())
  } finally {
    s.restore()
  }
})

test('hashchange 重入：已开标签点击通知（仅 fragment 变化）触发跳转', () => {
  let opened = null
  const sessions = {
    open: (sid) => { opened = sid },
    list: {
      subscribe() { throw new Error('快照已命中不应订阅') },
      getSnapshot: () => ({ byId: { new1: {} } }),
    },
  }
  const s = setupFake(sessions, {
    // 加载时地址没有 session：首次 attempt 为 no-op。
    search: '?token=t1', hash: '', href: 'http://127.0.0.1:3080/?token=t1',
  })
  try {
    applySessionDeepLink(s.ctx)
    assert.equal(opened, null, '加载时无 session 不跳转')
    assert.equal(s.calls.timers.length, 0, '无 session 不注册 timer')
    assert.equal(s.calls.listeners.filter((l) => l.type === 'hashchange').length, 1, 'hashchange 监听已注册')
    // 模拟点击通知：URL 仅 fragment 变化（不触发加载）。
    s.win.location.hash = '#session=new1'
    s.emitHashchange()
    assert.equal(opened, 'new1', 'hashchange 重入后打开新会话')
    assert.equal(s.calls.replaceState, 1, '跳转成功后清理 URL')
    assert.equal(s.calls.warns.length, 0, '成功路径无警告')
    assert.doesNotThrow(() => s.dispose())
    assert.equal(s.calls.listeners.length, 0, 'dispose 移除 hashchange 监听')
  } finally {
    s.restore()
  }
})

test('hashchange 无 session 时 no-op（粘贴无会话的 fragment 不误跳）', () => {
  const s = setupFake(
    {
      open() {},
      list: {
        subscribe() { throw new Error('不应订阅') },
        getSnapshot: () => ({ byId: {} }),
      },
    },
    { search: '?token=t1', hash: '', href: 'http://127.0.0.1:3080/?token=t1' },
  )
  try {
    applySessionDeepLink(s.ctx)
    s.win.location.hash = '#foo=1'
    s.emitHashchange()
    assert.equal(s.calls.timers.length, 0, 'hash 无 session 不注册 timer')
    assert.equal(s.calls.replaceState, 0, '不清 URL')
    assert.equal(s.calls.warns.length, 0)
    assert.doesNotThrow(() => s.dispose())
  } finally {
    s.restore()
  }
})

test('hashchange 重入幂等：新尝试先回收上一次的等待（timer 清除 + 解除订阅）', () => {
  const byId = {}
  let opened = null
  let unsubbed = 0
  let subscribed = 0
  const sessions = {
    open(sid) { opened = sid },
    list: {
      subscribe: () => { subscribed += 1; return () => { unsubbed += 1 } },
      getSnapshot: () => ({ byId }),
    },
  }
  const s = setupFake(sessions)
  try {
    applySessionDeepLink(s.ctx)
    assert.equal(subscribed, 1, '首次 attempt 订阅等待')
    assert.equal(s.calls.timers.length, 1)
    // 等待中会话出现且 fragment 换成新 id：旧等待必须被回收再跳转。
    byId.new2 = {}
    s.win.location.hash = '#session=new2'
    s.emitHashchange()
    assert.equal(unsubbed, 1, '旧等待已解除订阅')
    assert.equal(s.calls.cleared, 1, '旧等待的 timer 已清除')
    assert.equal(subscribed, 1, '新会话已在快照中，不再新建订阅')
    assert.equal(opened, 'new2', '重入后打开新会话')
    assert.equal(s.calls.replaceState, 1, '成功跳转清理 URL')
    assert.equal(s.calls.warns.length, 0)
    assert.doesNotThrow(() => s.dispose())
  } finally {
    s.restore()
  }
})
