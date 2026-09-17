/**
 * dsh-notify — host 侧事件监听与通知编排。
 *
 * 监听 Cordis 事件（轮次完成 / 审批请求 / Agent 出错 / 会话完成），按
 * settings 开关与聚焦状态决定是否发系统通知，并组装通知文案与深链 URL。
 * 平台通道实现见 system-notify.ts，文案见 notify-text.ts，聚焦状态见 presence.ts。
 *
 * 文案本地化：跟随官方 locale 插件的 settings 偏好（设置 → 通用 → 语言），
 * 读不到回落中文（见 notify-text.ts）。正文身份优先会话标题（官方
 * sessionTitle 服务），回落模型名——多会话并行时用户要能分辨是哪一个。
 *
 * 聚焦抑制分级（页面可见且上报新鲜时）：
 *   - 轮次完成 / 会话完成：抑制——非阻塞事件，用户正看着界面时弹通知是纯噪音；
 *   - 审批请求 / 出错：不抑制——审批是阻塞性的（用户不点就卡住），且官方审批
 *     UI 只出现在对应会话内，用户在看别的会话时看不到；错误同理（要知道出事了）。
 *
 * 通知是增益不是依赖：所有失败静默，绝不拖垮宿主进程。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ApprovalOutcome, ApprovalRequest } from '@deepseek-ai/dsh-user-approval'
import type {} from '@deepseek-ai/dsh-user-approval'
// Type-only: pulls the @deepseek-ai/cordis Events merge (agent/status, agent/error).
import type {} from '@deepseek-ai/dsh-agent'
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import { errorDedupKey, isSubagent, NOTIFY_EVENTS, pruneExpired, sessionLabelOf, summaryOf } from './notify-policy.ts'
import { notifyTextOf, type NotifyText } from './notify-text.ts'
import { createPresenceTracker, parsePresencePayload, PRESENCE_ENDPOINT, PRESENCE_RPC_CHANNEL } from './presence.ts'
import { systemNotify } from './system-notify.ts'

/** 通知开关（与 settings schema 的 notify 子对象一致）。 */
export interface NotifyConfig {
  enabled: boolean
  approval: boolean
  turn: boolean
  sessionDone: boolean
  error: boolean
  /** 提示音：true=显式 Glass（macOS）/系统默认音（Windows）；false=跟随系统默认（macOS）/真静音（Windows）。Linux 忽略。 */
  sound: boolean
}

/** 通知正文最大长度（超出截断加 …），保持 toast/横幅美观统一。 */
const NOTIFY_BODY_MAX = 80

/** 轮次完成去重窗口：同一 agent 5s 内只发一条，避免 HMR/会话快速重载连发刷屏。 */
const TURN_DEDUP_MS = 5_000

/** 出错去重窗口：同一 agent 的同一错误 30s 内只发一条。 */
const ERROR_DEDUP_MS = 30_000

/** 官方 locale 插件的 settings namespace 与偏好字段。 */
const LOCALE_SETTINGS_NAMESPACE = 'locale'
const LOCALE_PREFERENCE_FIELD = 'preference'

/**
 * 语言偏好的读取缓存时长。`settings.describe()` 会为每个 namespace 克隆
 * 组合层与用户层（部署可能装着 llm-pi-ai 这类大配置），每次通知都读一遍
 * 不划算；缓存 30s 的代价只是切换语言后最多 30s 内通知仍用旧语言。
 */
const LOCALE_CACHE_MS = 30_000

/**
 * 安装系统通知：注册事件监听，读 settings 配置判断总开关与各事件开关，
 * 并接收浏览器半区的聚焦上报（页面可见时抑制非阻塞事件的通知）。
 *
 * @param ctx - host context（含 settings 服务的 `notify` scope）。
 * @param configOf - 读取当前通知配置（由组合器注入，scope.get() 快照）。
 * @param baseUrl - 浏览器地址（默认 3080；函数形式每次重新解析端口）。
 */
export function applySystemNotify(
  ctx: Context,
  configOf: () => NotifyConfig,
  baseUrl: string | (() => string) = 'http://127.0.0.1:3080',
): void {
  const presence = createPresenceTracker()
  // 聚焦通道：client 半区经官方 Connection RPC 上报页面可见性。connection 是
  // 可选服务（无浏览器半区 / 非 web 部署时不存在）→ scoped inject，缺失时
  // 只跳过聚焦感知（通知照常，判定恒为"不可见"）；rpc.handle 自带信任围栏
  // （Host/Origin + 浏览器认证）并把注册挂到当前 fiber，无需再包 effect。
  ctx.inject(['connection'], (connectionCtx) => {
    const connection = connectionCtx.get('connection') as HostConnectionHandle | undefined
    if (connection === undefined) return
    connection.rpc.handle(PRESENCE_RPC_CHANNEL, async (endpoint, payload) => {
      if (endpoint !== PRESENCE_ENDPOINT) {
        return { ok: false, error: { code: 'dsh-notify/unknown-endpoint', message: `unknown endpoint: ${endpoint}`, details: {} } }
      }
      const visible = parsePresencePayload(payload)
      if (visible === undefined) {
        return { ok: false, error: { code: 'dsh-notify/bad-payload', message: 'expected { visible: boolean }', details: {} } }
      }
      presence.report(visible)
      return { ok: true, value: null }
    })
  })
  // 通知文案：跟随官方 locale 设置的语言偏好，读不到回落中文（见 notify-text.ts）。
  let localeCache: { at: number; preference: unknown } | undefined
  const textOf = (): NotifyText => {
    const now = Date.now()
    if (localeCache !== undefined && now - localeCache.at < LOCALE_CACHE_MS) {
      return notifyTextOf(localeCache.preference)
    }
    let preference: unknown
    try {
      const descriptor = ctx.settings.describe().find((item) => item.ns === LOCALE_SETTINGS_NAMESPACE)
      preference = (descriptor?.value as Record<string, unknown> | undefined)?.[LOCALE_PREFERENCE_FIELD]
    } catch {
      preference = undefined // settings 未就绪/读取失败：回落中文
    }
    localeCache = { at: now, preference }
    return notifyTextOf(preference)
  }
  // 会话身份标签：优先官方 sessionTitle 折叠出的会话标题（用户认得），
  // 回落模型名（AgentOptions），都没有则 undefined 由调用方用固定文案。
  const sessionLabel = (agent: unknown): string | undefined => {
    let title: string | undefined
    try {
      const service = ctx.get('sessionTitle') as { get?: (session: unknown) => { title?: unknown } | undefined } | undefined
      const session = (agent as { session?: unknown } | null | undefined)?.session
      if (typeof service?.get === 'function' && session != null) {
        const snapshot = service.get(session)
        if (typeof snapshot?.title === 'string') title = snapshot.title
      }
    } catch {
      title = undefined // 服务缺失/会话已销毁：回落模型名
    }
    return sessionLabelOf(title, agent)
  }
  // 深链基址：惰性读 webServer 实际监听端口（官方 dsh-web-app 同款读取），每次通知
  // 都重新解析——apply 早于 webServer 就绪、或用 --port 起非默认端口时，
  // 一次性快照会永久停在回落值、点击跳转静默失效。
  const sessionOpenUrl = (sessionId: string): string => {
    const base = typeof baseUrl === 'function' ? baseUrl() : baseUrl
    // rc.1 起 web 界面默认启用进程 token 鉴权（本机 127.0.0.1 同样 401）：
    // 直接打开 `/?session=` 在浏览器无 cookie 时会撞认证墙。这里用官方
    // authenticatedUrl 带上进程 token，session 改走 `#` fragment——token 交换
    // 的 303 重定向会保留 fragment（RFC 7231 §7.1.2），client 读 hash 即可
    // 完成「首次认证 + 会话跳转」二合一；已认证浏览器直接命中同一 fragment。
    // connection 服务缺失时降级为旧的无 token URL（行为与以前一致）。
    const connection = (ctx as Context & { connection?: HostConnectionHandle }).connection
    try {
      const authenticated = connection?.authenticatedUrl(base) ?? base
      return `${authenticated}#session=${encodeURIComponent(sessionId)}`
    } catch {
      return `${base}/?session=${encodeURIComponent(sessionId)}`
    }
  }
  /** 通知是增益不是依赖：任何处理器内的异常都不允许冒泡进事件总线。 */
  const safe = (run: () => void): void => {
    try {
      run()
    } catch {
      /* 观察失败静默 */
    }
  }

  // 轮次完成：agent 从 running 回到 idle。
  const lastTurnAt = new Map<string, number>()
  ctx.on(NOTIFY_EVENTS.turnDone, (payload) => {
    safe(() => {
      const cfg = configOf()
      if (!cfg.enabled || !cfg.turn) return
      if (payload.status !== 'idle') return
      if (isSubagent(payload.agent)) return
      if (presence.shouldSuppress()) return // 非阻塞事件：用户正看着界面就不打扰
      const now = Date.now()
      pruneExpired(lastTurnAt, now, TURN_DEDUP_MS)
      if (now - (lastTurnAt.get(payload.agent.id) ?? 0) < TURN_DEDUP_MS) return
      lastTurnAt.set(payload.agent.id, now)
      const text = textOf()
      const label = sessionLabel(payload.agent)
      const body = label !== undefined ? text.turnBodyNamed(label) : text.turnBody
      systemNotify(text.turnTitle, body, sessionOpenUrl(payload.agent.id), cfg.sound)
    })
  }, { global: true })
  // 审批请求：waterfall 事件，只观察必须 next() 委托。通知体包 try/catch——
  // configOf 或属性访问一旦同步抛出，next() 不执行会否决整条链（卡死审批流）。
  // 不做聚焦抑制：审批是阻塞性的（用户不点就卡住），且官方审批 UI 只在对应
  // 会话内出现，用户在看别的会话时看不到。
  ctx.on(NOTIFY_EVENTS.approval, (req: ApprovalRequest, next: () => Promise<ApprovalOutcome>): Promise<ApprovalOutcome> => {
    try {
      const cfg = configOf()
      if (!isSubagent(req.agent) && cfg.enabled && cfg.approval) {
        const text = textOf()
        // toolName 运行时可能缺失（宿主协议旧版/畸形 payload）：`${undefined}`
        // 会展示成字面 "undefined"，缺失时用可读兜底文案。
        const toolName = req.toolName ?? text.approvalToolFallback
        const detail = req.reason !== undefined && req.reason !== ''
          ? `${toolName} · ${req.reason}`
          : toolName
        const label = sessionLabel(req.agent)
        systemNotify(text.approvalTitle, summaryOf(label !== undefined ? `${label} · ${detail}` : detail, NOTIFY_BODY_MAX), sessionOpenUrl(req.agent.id), cfg.sound)
      }
    } catch { /* 通知是增益不是依赖：观察失败不阻断审批链 */ }
    return next()
  }, { global: true })
  // 错误：受总开关 + error 子开关控制。去重键是 agent id + 消息指纹——
  // 同一会话的同一错误 30s 内只发一条避免刷屏，但用户修复后出现的
  // 不同错误在同一窗口内仍会各自通知（不被旧去重键吞掉）。
  // 每次事件先清理已过期条目，防止长期运行后无界增长（见 pruneExpired）。
  // 不做聚焦抑制：错误要送达（用户可能在看别的会话）。
  const lastErrorAt = new Map<string, number>()
  ctx.on(NOTIFY_EVENTS.error, (payload) => {
    safe(() => {
      const cfg = configOf()
      if (!cfg.enabled || !cfg.error) return
      if (isSubagent(payload.agent)) return
      const now = Date.now()
      // 解析边界：Error 实例优先 message；空 message 回退 name；非 Error 原样输出；
      // 完全缺失兜底本地化的「未知错误」。绝不抛（safe 内）。
      const text = textOf()
      const detail = payload.error instanceof Error
        ? payload.error.message || payload.error.name || text.errorUnknown
        : String(payload.error ?? text.errorUnknown)
      const key = errorDedupKey(payload.agent.id, detail)
      pruneExpired(lastErrorAt, now, ERROR_DEDUP_MS)
      if (now - (lastErrorAt.get(key) ?? 0) < ERROR_DEDUP_MS) return
      lastErrorAt.set(key, now)
      // 正文拼上会话身份区分来源（agent/error 的 payload 同为 Agent）。
      const label = sessionLabel(payload.agent)
      systemNotify(text.errorTitle, summaryOf(label !== undefined ? `${label} · ${detail}` : detail, NOTIFY_BODY_MAX), sessionOpenUrl(payload.agent.id), cfg.sound)
    })
  }, { global: true })
  // 会话完成：agent 被销毁即视为会话结束（与轮次完成区分开）。
  ctx.on(NOTIFY_EVENTS.sessionDone, (payload) => {
    safe(() => {
      const cfg = configOf()
      if (!cfg.enabled || !cfg.sessionDone) return
      if (isSubagent(payload.agent)) return
      if (presence.shouldSuppress()) return // 非阻塞事件：同轮次完成
      const text = textOf()
      const label = sessionLabel(payload.agent)
      const body = label !== undefined ? text.sessionDoneBodyNamed(label) : text.sessionDoneBody
      systemNotify(text.sessionDoneTitle, body, sessionOpenUrl(payload.agent.id), cfg.sound)
    })
  }, { global: true })
}
