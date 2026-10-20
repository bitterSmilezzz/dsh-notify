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

test('声音开关不再投影到 silent：系统声恒静，音色由插件合成', () => {
  // 旧行为是 silent: !sound（把「响不响」交给系统）。Web Notification 无法指定
  // 音色，所以音效改由 sound.ts 合成，系统声一律静音——否则开关关不掉系统那一份。
  // 音色、节流与静默降级的断言见 sound.test.mjs。
  const loud = setup()
  loud.harness.pushError('s1', 'boom')
  assert.equal(loud.notifications.instances[0].options.silent, true)

  const quiet = setup({ config: { sound: false } })
  quiet.harness.pushError('s1', 'boom')
  assert.equal(quiet.notifications.instances[0].options.silent, true, '关闭后同样静音系统声')
  assert.equal(quiet.notifications.instances.length, 1, '关闭声音不影响横幅送达')
})

test('点击通知：聚焦窗口并打开对应会话，随后释放持有引用', () => {
  const { harness, notifications, bundle } = setup()
  harness.pushError('s1', 'boom')
  notifications.instances[0].click()
  assert.deepEqual(harness.opened, ['s1'])
  assert.equal(bundle.globals.window.focused, true)
})

test('点击通知走 uiWorkspace.openSession（0.2 起的官方导航入口）', () => {
  // 回归：0.1.x 的 `sessions.open()` 在 0.2 已被移除，旧实现直接调用它会在
  // try/catch 里静默 TypeError——窗口被拉到前台，会话却停在原处。
  const { harness, notifications } = setup()
  harness.pushError('s1', 'boom')
  notifications.instances[0].click()
  assert.deepEqual(harness.opened, ['s1'], '导航必须到达 uiWorkspace.openSession')
  assert.equal(harness.sessions.open, undefined, '当前形态的 sessions 没有 open()')
})

test('点击通知：uiWorkspace 缺失时回落到旧版 sessions.open', () => {
  const { harness, notifications } = setup({ legacyNavigation: true })
  harness.pushError('s1', 'boom')
  notifications.instances[0].click()
  assert.deepEqual(harness.opened, ['s1'], '旧版组合仍能跳转')
})

test('点击通知：导航服务晚于本插件激活时仍能跳转（服务按点击时解析）', () => {
  // `ctx.get` 只返回 ACTIVE 提供方的值；apply 时缓存服务会把「此刻还没有」
  // 永久固化成 undefined，于是插件装上了却永远点不动——这条钉子钉住运行期解析。
  const { harness, notifications } = setup({ lateUiWorkspace: true })
  harness.pushError('s1', 'boom')
  harness.activateUiWorkspace()
  notifications.instances[0].click()
  assert.deepEqual(harness.opened, ['s1'])
})

test('点击通知：导航入口全缺时不抛错，只给可见提示', () => {
  const { harness, notifications } = setup({ withoutUiWorkspace: true })
  harness.pushError('s1', 'boom')
  assert.doesNotThrow(() => notifications.instances[0].click(), '点击回调绝不冒泡')
  assert.deepEqual(harness.opened, [], '没有入口就不跳')
  assert.equal(notifications.instances[0].closed, true, '通知照常关闭')
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

test('会话身份缓存随行回收：移除后的迟到事件回落短 id，不沿用旧标题', () => {
  const { harness, notifications } = setup({ rows: [{ id: 'session-abc', title: '旧标题' }] })
  // 会话结束：这一条仍应使用最后已知标题。
  harness.setSessions([])
  assert.equal(titles(notifications).at(-1), 'titleSessionDone')
  assert.match(notifications.instances.at(-1).options.body, /旧标题/)
  // 迟到的错误事件：行已不在快照里，缓存也已随行回收 → 回落短 id。
  const before = notifications.instances.length
  harness.pushError('session-abc', 'boom')
  assert.equal(notifications.instances.length, before + 1)
  assert.match(notifications.instances.at(-1).options.body, /session-/)
  assert.doesNotMatch(notifications.instances.at(-1).options.body, /旧标题/)
})

test('tag：信息类按会话替换、阻塞类用独立 tag；Windows 浏览器不发，Electron 宿主照发', () => {
  const mac = setup()
  mac.harness.pushError('s1', 'boom')
  assert.equal(mac.notifications.instances[0].options.tag, 'dsh-notify:s1')

  // Windows + 浏览器：社区实测带 tag 不送达，保守不发。
  const winBrowser = setup({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/152.0.0.0', platform: 'Win32' })
  winBrowser.harness.pushError('s1', 'boom')
  assert.equal(winBrowser.notifications.instances[0].options.tag, undefined)

  // Windows + Electron（DSH 桌面版）：Electron 44.7.0 实测可送达且能替换。
  const winElectron = setup({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) DeepSeek/0.2.1-rc.2 Chrome/152.0.0.0 Electron/44.7.0 Safari/537.36',
    platform: 'Win32',
  })
  winElectron.harness.pushError('s1', 'boom')
  assert.equal(winElectron.notifications.instances[0].options.tag, 'dsh-notify:s1')
})

test('tag：阻塞卡与信息卡的 tag 不同（否则系统侧「同 tag 即替换」会顶掉审批卡）', () => {
  const { harness, notifications } = setup()
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  harness.pushStatus({ s1: { running: false } })
  harness.pushStatus({ s1: { running: true } })
  harness.pushStatus({ s1: { running: false } })
  const approval = notifications.instances.find((n) => n.options.requireInteraction === true)
  const info = notifications.instances.find((n) => n.options.requireInteraction === false)
  assert.ok(approval !== undefined, '应有一条审批通知')
  assert.ok(info !== undefined, '应有一条信息类通知')
  assert.notEqual(approval.options.tag, info.options.tag, '两类通知必须用不同 tag')
  assert.equal(approval.options.tag, 'dsh-notify:s1:blocking')
  assert.equal(info.options.tag, 'dsh-notify:s1')
})

// ── 阻塞性通知的存亡（Windows 关键行为）────────────────────────────────
//
// Windows 上 `notification.close()` 会把 toast 从通知中心**摘掉**（实测：
// 关闭后该 toast 在 Windows 通知库里连行都不剩）。因此「后来的信息类通知
// 顺手 close 掉前一条审批卡」在 Windows 上等于「审批请求凭空消失」——
// 用户回到电脑只看到一条无关的完成提示，需要处理的那个请求没有任何痕迹。
//
// 这组用例钉住：信息类事件**不得**关掉同会话还等着处理的阻塞卡。

test('阻塞性通知不被后续信息类事件关掉（Windows 上审批卡会整条消失）', () => {
  const { harness, notifications } = setup()
  // 先来一个需要用户处理的审批。
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  assert.equal(notifications.instances.length, 1)
  const approval = notifications.instances[0]
  assert.equal(approval.options.requireInteraction, true)

  // 随后同一会话走完一轮（信息类）。
  harness.pushStatus({ s1: { running: false } })
  harness.pushStatus({ s1: { running: true } })
  harness.pushStatus({ s1: { running: false } })

  assert.equal(notifications.instances.length, 2, '轮次完成应另外弹一条')
  assert.equal(approval.closed, false, '审批卡不得被信息类通知关掉（Windows 上关掉即消失）')
  assert.equal(notifications.instances[1].options.requireInteraction, false)
})

test('阻塞性通知不被同会话的出错通知关掉', () => {
  const { harness, notifications } = setup()
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  harness.pushError('s1', 'boom')
  assert.equal(notifications.instances.length, 2)
  assert.equal(notifications.instances[0].closed, false, '审批卡不得被出错通知顶掉')
})

test('阻塞性通知不被同会话的「会话结束」通知关掉', () => {
  const { harness, notifications } = setup()
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'question', key: 'q1', sessionId: 's1', questions: [{ question: '继续吗' }] } } })
  harness.setSessions([])
  assert.equal(notifications.instances.length, 2)
  assert.equal(notifications.instances[0].closed, false, '提问卡不得被「会话结束」顶掉')
})

test('新的阻塞请求顶掉同会话旧的阻塞请求（用户已处理完前一个）', () => {
  const { harness, notifications } = setup()
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a2', sessionId: 's1', toolName: 'read' } } })
  assert.equal(notifications.instances.length, 2)
  assert.equal(notifications.instances[0].closed, true, '旧的阻塞请求应被新的取代')
  assert.equal(notifications.instances[1].closed, false)
})

test('信息类通知之间仍按会话替换（不堆叠）', () => {
  const { harness, notifications } = setup()
  harness.pushStatus({ s1: { running: false } })   // 轮次完成
  harness.pushError('s1', 'boom')                    // 出错：同属信息类，应顶掉上一条
  assert.equal(notifications.instances.length, 2)
  assert.equal(notifications.instances[0].closed, true, '上一条信息卡应被替换')
})

test('信息卡与阻塞卡并存：点击阻塞卡不误伤同会话的信息卡', () => {
  const { harness, notifications } = setup()
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  harness.pushStatus({ s1: { running: false } })   // 信息卡：轮次完成
  harness.pushError('s1', 'boom')                    // 信息卡：出错（顶掉轮次完成）
  assert.equal(notifications.instances.length, 3)
  const approval = notifications.instances[0]
  const latestInfo = notifications.instances[2]
  // 点掉阻塞卡：只释放它自己那条持有引用，同会话的信息卡仍被持有。
  approval.click()
  assert.equal(approval.closed, true)
  assert.equal(latestInfo.closed, false, '点掉阻塞卡不应顺手关掉信息卡')
  // 后续再来一条信息：旧的信息卡应被正常替换（说明它的持有引用没被误删）。
  harness.pushError('s1', 'boom-2')
  assert.equal(latestInfo.closed, true, '信息卡仍能被后续信息卡替换（持有引用未被误删）')
})

test('点击阻塞卡：导航到对应会话', () => {
  const { harness, notifications, bundle } = setup()
  harness.pushStatus({ s1: { running: true, pendingInteraction: { kind: 'approval', key: 'a1', sessionId: 's1', toolName: 'bash' } } })
  notifications.instances[0].click()
  assert.deepEqual(harness.opened, ['s1'])
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
