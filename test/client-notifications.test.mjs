/**
 * 通知控制器行为测试：直接驱动真实的 `lib/client.js`（浏览器半区产物），
 * 断言「什么事件在什么配置下真的弹了通知、弹出什么、点击后去哪里」。
 *
 * 覆盖的是纯函数测试覆盖不到的那一半：事件订阅接线、开关投影、去重窗口、
 * 免打扰豁免、子代理过滤、点击跳转、平台 tag 策略。每条断言都对着可观察的
 * 投递结果（假 Notification 的 title/options）或副作用（sessions.open）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadClientBundle, makeClientContext } from './helpers/client-harness.mjs'

/** 装载一份全新的插件实例 + 假环境。 */
function setup(options = {}) {
  const bundle = loadClientBundle(options)
  const harness = makeClientContext(options)
  bundle.exports.apply(harness.ctx)
  // 会话列表在控制器订阅之前就要就位：首次快照只建基线，不补历史通知。
  harness.setSessions(options.rows ?? [{ id: 's1', title: '会话一' }])
  harness.pushStatus(options.status ?? { s1: { running: true } })
  return { bundle, harness, notifications: bundle.notifications }
}

/** 断言只投递了给定标题的通知。 */
function titles(notifications) {
  return notifications.instances.map((n) => n.title)
}

test('审批请求：弹通知，正文含工具名与会话标题', () => {
  const { harness, notifications } = setup()
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  assert.equal(notifications.instances.length, 1)
  assert.equal(titles(notifications)[0], 'titleApproval')
  assert.match(notifications.instances[0].options.body, /会话一/)
  assert.match(notifications.instances[0].options.body, /bash/)
  // 审批是阻塞性的：常驻通知中心
  assert.equal(notifications.instances[0].options.requireInteraction, true)
})

test('审批：同一个请求 key 持续存在时不重复弹', () => {
  const { harness, notifications } = setup()
  const pending = { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' }
  harness.pushStatus({ s1: { running: true, pendingInteraction: pending } })
  harness.pushStatus({ s1: { running: true, pendingInteraction: pending } })
  harness.pushStatus({ s1: { running: true, pendingInteraction: pending } })
  assert.equal(notifications.instances.length, 1)
})

test('审批：换成新的请求 key 会再弹一条，且替换同一会话的上一条', () => {
  const { harness, notifications } = setup()
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a2', sessionId: 's1', toolName: 'read' } } })
  assert.equal(notifications.instances.length, 2)
  assert.equal(notifications.instances[0].closed, true, '同一会话的上一条应被关闭（替换而非堆叠）')
})

test('提问请求：弹通知，正文用第一个问题', () => {
  const { harness, notifications } = setup()
  harness.pushStatus({
    s1: {
      running: true,
      pendingInteraction: { kind: 'question', key: 'q1', sessionId: 's1', questions: [{ question: '要部署到哪个环境？' }] },
    },
  })
  assert.equal(titles(notifications)[0], 'titleQuestion')
  assert.match(notifications.instances[0].options.body, /要部署到哪个环境/)
})

test('计划审阅：提问通道，正文用「待审阅计划」而不是空问题', () => {
  const { harness, notifications } = setup()
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'plan-review', key: 'p1', sessionId: 's1', questions: [] } } })
  assert.equal(titles(notifications)[0], 'titleQuestion')
  assert.match(notifications.instances[0].options.body, /questionPlanReview/)
})

test('轮次完成：窗口不可见 + 非主视图时提醒', () => {
  const { bundle, harness, notifications } = setup({ rows: [{ id: 's1', title: '会话一' }] })
  bundle.globals.document.visibilityState = 'hidden'
  harness.pushStatus({ s1: { running: false } })
  assert.deepEqual(titles(notifications), ['titleTurn'])
})

test('轮次完成：窗口可见但主视图在别的会话时提醒', () => {
  const { harness, notifications } = setup({
    rows: [{ id: 's1', title: '会话一' }, { id: 's2', title: '会话二', retainedBy: { mainView: 1 } }],
    status: { s1: { running: true }, s2: { running: false } },
  })
  harness.pushStatus({ s1: { running: false }, s2: { running: false } })
  assert.deepEqual(titles(notifications), ['titleTurn'])
  assert.match(notifications.instances[0].options.body, /会话一/)
})

test('轮次完成：正看着这个会话且窗口在前台时不打扰', () => {
  const { harness, notifications } = setup({ rows: [{ id: 's1', title: '会话一', retainedBy: { mainView: 1 } }] })
  harness.pushStatus({ s1: { running: false } })
  assert.deepEqual(titles(notifications), [])
})

test('轮次完成：completionUnread 置位时即使没观测到 running 边沿也提醒', () => {
  const { harness, notifications } = setup({
    rows: [{ id: 's1', title: '会话一' }, { id: 's2', title: '会话二', retainedBy: { mainView: 1 } }],
    status: { s1: { running: true }, s2: { running: true } },
  })
  // s1 是新出现的会话（此前没有基线），运行时直接给出 completionUnread。
  harness.pushStatus({ s1: { running: false, completionUnread: true }, s2: { running: true } })
  assert.deepEqual(titles(notifications), ['titleTurn'])
})

test('错误：弹通知并带错误文本；同一错误 30s 内只弹一条', () => {
  const { harness, notifications } = setup()
  harness.pushError('s1', 'boom')
  harness.pushError('s1', 'boom')
  harness.pushError('s1', 'different')
  assert.deepEqual(titles(notifications), ['titleError', 'titleError'])
  assert.match(notifications.instances[0].options.body, /boom/)
})

test('子代理：默认不弹；打开 subagent 开关后弹子代理通知', () => {
  const subagentRows = [{ id: 's1', title: '主会话' }, { id: 'sub1', title: '子代理任务', origin: 'subagent' }]
  const off = setup({ rows: subagentRows, status: { s1: { running: true }, sub1: { running: true } } })
  off.harness.pushStatus({ s1: { running: true }, sub1: { running: false } })
  assert.deepEqual(titles(off.notifications), [])

  const on = setup({ rows: subagentRows, status: { s1: { running: true }, sub1: { running: true } }, config: { subagent: true } })
  on.harness.pushStatus({ s1: { running: true }, sub1: { running: false } })
  assert.deepEqual(titles(on.notifications), ['titleSubagent'])
})

test('子代理：错误不会伪装成主会话错误（走子代理开关）', () => {
  const { harness, notifications } = setup({
    rows: [{ id: 's1', title: '主会话' }, { id: 'sub1', title: '子代理', origin: 'subagent' }],
  })
  harness.pushError('sub1', '子代理炸了')
  assert.deepEqual(titles(notifications), [])
})

test('总开关关闭：任何事件都不弹', () => {
  const { harness, notifications } = setup({ config: { enabled: false } })
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  harness.pushStatus({ s1: { running: false } })
  harness.pushError('s1', 'boom')
  assert.deepEqual(titles(notifications), [])
})

test('分项开关：关掉审批后审批不弹，其它事件不受影响', () => {
  const { harness, notifications } = setup({ config: { approval: false } })
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  harness.pushError('s1', 'boom')
  assert.deepEqual(titles(notifications), ['titleError'])
})

test('免打扰时段：轮次完成被抑制，审批与出错仍然送达', () => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const clock = (offsetMinutes) => {
    const at = new Date(now.getTime() + offsetMinutes * 60_000)
    return `${pad(at.getHours())}:${pad(at.getMinutes())}`
  }
  const { harness, notifications } = setup({
    config: { quietHours: true, quietStart: clock(-30), quietEnd: clock(30) },
  })
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  harness.pushStatus({ s1: { running: false } })
  harness.pushError('s1', 'boom')
  assert.deepEqual(titles(notifications), ['titleApproval', 'titleError'])
})

test('免打扰时段之外照常提醒（跨午夜区间不误伤白天）', () => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  // 一个肯定不包含「现在」的窗口：现在 +2h 到 +3h。
  const at = (offsetMinutes) => {
    const d = new Date(now.getTime() + offsetMinutes * 60_000)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const { harness, notifications } = setup({
    config: { quietHours: true, quietStart: at(120), quietEnd: at(180) },
    rows: [{ id: 's1', title: '会话一' }],
  })
  harness.pushStatus({ s1: { running: false } })
  assert.deepEqual(titles(notifications), ['titleTurn'])
})

test('免打扰时段配置非法时不静音（宁可多提醒）', () => {
  const { harness, notifications } = setup({ config: { quietHours: true, quietStart: 'oops', quietEnd: '08:00' } })
  harness.pushStatus({ s1: { running: false } })
  assert.deepEqual(titles(notifications), ['titleTurn'])
})

test('隐私开关：summary 关闭时正文只留会话名', () => {
  const { harness, notifications } = setup({ config: { summary: false } })
  harness.pushError('s1', 'boom-secret')
  assert.equal(notifications.instances[0].options.body, '会话一')
  assert.doesNotMatch(notifications.instances[0].options.body, /boom-secret/)
})

test('声音开关：关闭时通知带 silent', () => {
  const loud = setup()
  loud.harness.pushError('s1', 'boom')
  assert.equal(loud.notifications.instances[0].options.silent, false)

  const quiet = setup({ config: { sound: false } })
  quiet.harness.pushError('s1', 'boom')
  assert.equal(quiet.notifications.instances[0].options.silent, true)
})

test('点击通知：聚焦窗口并打开对应会话，随后释放持有引用', () => {
  const { harness, notifications, bundle } = setup()
  harness.pushError('s1', 'boom')
  notifications.instances[0].click()
  assert.deepEqual(harness.sessions.opened, ['s1'])
  assert.equal(bundle.globals.window.focused, true)
})

test('会话被移除：弹「会话已结束」通知', () => {
  const { harness, notifications } = setup({ rows: [{ id: 's1', title: '会话一' }] })
  harness.setSessions([])
  assert.deepEqual(titles(notifications), ['titleSessionDone'])
  assert.match(notifications.instances[0].options.body, /会话一/)
})

test('会话被移除：子代理会话不弹「会话已结束」（行已从快照消失仍要判对）', () => {
  const { harness, notifications } = setup({ rows: [{ id: 'sub', title: '子代理任务', origin: 'subagent' }] })
  harness.setSessions([])
  assert.deepEqual(titles(notifications), [])
})

test('会话被移除：打开 subagent 开关后子代理结束也提醒', () => {
  const { harness, notifications } = setup({
    rows: [{ id: 'sub', title: '子代理任务', origin: 'subagent' }],
    config: { subagent: true },
  })
  harness.setSessions([])
  assert.deepEqual(titles(notifications), ['titleSessionDone'])
  assert.match(notifications.instances[0].options.body, /子代理任务/)
})

test('tag：macOS 按会话替换，Windows 一律不发（社区实测带 tag 不达）', () => {
  const mac = setup()
  mac.harness.pushError('s1', 'boom')
  assert.equal(mac.notifications.instances[0].options.tag, 'dsh-notify:s1')

  const win = setup({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32' })
  win.harness.pushError('s1', 'boom')
  assert.equal(win.notifications.instances[0].options.tag, undefined)
})

test('权限未授予：静默不投递（不抛错）', () => {
  const { harness, notifications } = setup({ permission: 'denied' })
  assert.doesNotThrow(() => harness.pushError('s1', 'boom'))
  assert.equal(notifications.instances.length, 0)
})

test('未提供 uiSession（部署缺该插件）时控制器直接退出且不抛错', () => {
  const bundle = loadClientBundle()
  const harness = makeClientContext()
  harness.ctx.get = (name) => (name === 'sessions' ? harness.sessions : undefined)
  assert.doesNotThrow(() => bundle.exports.apply(harness.ctx))
})

test('启动安全：服务面畸形（缺 sessionStatus / 缺 list / 缺 $on）时 apply 不抛错', () => {
  // client 入口抛错会被桌面壳判为致命启动失败，所以每一种缺件都必须安全退出。
  const cases = [
    ['ui-session 存在但无 sessionStatus', { uiSession: {} }],
    ['sessions 存在但无 list', { sessions: {} }],
    ['remote 存在但无 $on', { remote: {} }],
  ]
  for (const [name, overrides] of cases) {
    const bundle = loadClientBundle()
    const harness = makeClientContext()
    const services = { sessions: harness.sessions, uiSession: harness.uiSession, remote: harness.remote, ...overrides }
    harness.ctx.get = (key) => services[key]
    assert.doesNotThrow(() => bundle.exports.apply(harness.ctx), name)
  }
})

test('启动安全：事件回调里的异常不冒泡（会话行畸形）', () => {
  const { harness } = setup()
  // byId 里塞一个畸形行：读取时不应把异常抛回官方事件总线。
  harness.sessions.rows = [{ id: 's1', title: undefined, retainedBy: null }]
  assert.doesNotThrow(() => harness.pushStatus({ s1: { running: false } }))
  assert.doesNotThrow(() => harness.pushError('s1', 'boom'))
})
