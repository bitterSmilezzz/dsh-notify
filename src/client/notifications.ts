/**
 * dsh-notify — client-side notification controller.
 *
 * 通道：渲染进程的 Web `Notification` API。
 *   - 桌面 App（Electron）：就是系统原生通知，发送方身份是 App 本身；DSH 壳对
 *     非 media 权限一律放行（`apps/desktop/src/microphone-permissions.ts`），
 *     因此 `Notification.permission` 恒为 `granted`，没有授权流程；
 *   - 浏览器：走浏览器通知，首次需要一次用户手势（设置卡的「开启通知」）。
 *
 * 事件源全部是**官方 client 缝**，不依赖 host 侧自建事件或 HTTP 上报：
 *   - `ctx.uiSession.sessionStatus`：每个会话的 `running` / `pendingInteraction`
 *     / `completionUnread`。`completionUnread` 由官方运行时在「会话结束但主视图
 *     不在该会话」时置位，正是「后台会话跑完了」的权威判据；
 *   - `ctx.remote.$on('api-session/error')`：会话级错误；
 *   - `ctx.sessions.list`：标题、`origin === 'subagent'` 与「会话被移除」。
 *
 * 投递失败一律静默（通知是增益不是依赖），但**订阅回调里的异常绝不冒泡**：
 * 这些回调挂在官方事件总线上，抛错会污染主视图与其它插件。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the ui-session Context merge (ctx.uiSession, sessionStatus).
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
// Type-only: pulls the session controller merge (ctx.sessions) and remote events.
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import {
  approvalDetailOf, errorDedupKey, isTurnEnd, notificationTagOf, parseClockMinutes,
  pruneExpired, quietHoursActive, sessionLabelOf, summaryOf,
} from '../notify-policy.ts'
import type { NotifyConfig } from './config.ts'
import type { LocaleT } from './locale.ts'

/** 通知正文最大长度（超出截断加 …），保持系统横幅一行可读。 */
const BODY_MAX = 96

/** 轮次完成去重窗口：同一会话 5s 内只发一条（running 抖动/重连会重复上报）。 */
const TURN_DEDUP_MS = 5_000

/** 出错去重窗口：同一会话的同一错误 30s 内只发一条。 */
const ERROR_DEDUP_MS = 30_000

/**
 * 持有 Notification 对象的最长时间。Electron 的点击/关闭回调在通知被 GC 后
 * 不再触发（Electron 通知的已知坑），而 `onclose` 并不保证到达，所以用一张
 * 有界表持有引用，超时兜底释放，避免长跑后无界增长。
 */
const HOLD_MS = 5 * 60_000

/** 事件类别：决定开关、免打扰豁免与去重。 */
type NoticeKind = 'approval' | 'question' | 'turn' | 'sessionDone' | 'error' | 'subagent'

/** 会话列表行（本控制器用到的字段面）。 */
interface SessionRowLike {
  title?: string
  displayTitle?: string
  origin?: string
  retainedBy?: { mainView?: number }
}

/** `ctx.sessions` 的最小面。 */
interface SessionsLike {
  list: {
    getSnapshot(): { ids: string[]; byId: Record<string, SessionRowLike> }
    subscribe(listener: () => void): () => void
  }
  open(id: string): void
}

/** 单个会话的官方 UI 状态。 */
interface StatusLike {
  running?: boolean | undefined
  pendingInteraction?: { kind: string; key: string; sessionId: string } | undefined
  completionUnread?: boolean | undefined
}

/** `ctx.uiSession` 的最小面。 */
interface UiSessionLike {
  sessionStatus: {
    getSnapshot(): ReadonlyMap<string, StatusLike>
    subscribe(listener: () => void): () => void
  }
}

/** `ctx.remote` 的最小面。 */
interface RemoteLike {
  $on(event: 'api-session/error', listener: (sessionId: string, message: string) => void): () => void
}

/** 通知文案与配置的读取面（由组合器注入）。 */
export interface NotifyRuntime {
  /** 当前配置快照。 */
  config: () => NotifyConfig
  /** locale 绑定的翻译函数。 */
  t: LocaleT
  /** 当前语言 id（`zh` / `en`），用于 displayReason 取词。 */
  activeLocale: () => string
}

/** 一条待投递的通知。 */
interface Notice {
  kind: NoticeKind
  sessionId: string
  title: string
  body: string
}

/** 设备平台串（Windows 上不发 tag，见 notificationTagOf 的契约）。 */
function platformOf(): string {
  if (typeof navigator === 'undefined') return ''
  // platform 比 userAgent 稳（UA 会被伪装/精简）；两者都读，交给整词判据。
  return `${navigator.platform ?? ''} ${navigator.userAgent}`
}

/** 页面当前是否「用户正在看」：可见且有焦点。 */
function watchingNow(): boolean {
  if (typeof document === 'undefined') return false
  return document.visibilityState === 'visible' && document.hasFocus()
}

/** 通知权限状态（`unsupported` 表示该运行时不提供 Notification）。 */
export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/**
 * 申请通知权限。**必须在用户手势里调用**（浏览器会静默拒绝无手势的请求）；
 * 桌面 App 恒为已授权，此调用直接返回 granted。
 * @returns 申请后的权限状态。
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/**
 * 发一条测试通知（设置卡按钮用；同时消化掉浏览器对 requestPermission 的
 * 用户手势要求）。
 * @param title - 通知标题。
 * @param body - 通知正文。
 * @param sound - 是否发声。
 * @returns 实际投递成功时为 true。
 */
export function sendTestNotification(title: string, body: string, sound: boolean): boolean {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  try {
    const notification = new Notification(title, { body, silent: !sound })
    notification.onclick = () => { try { window.focus() } catch { /* 聚焦可能被拒绝 */ } }
    return true
  } catch {
    return false
  }
}

/**
 * 安装通知控制器：订阅官方 client 事件并按策略投递系统通知。
 *
 * @param ctx - client root context。
 * @param runtime - 配置与文案读取面。
 */
export function applyNotifications(ctx: ClientContext, runtime: NotifyRuntime): void {
  // activation safety：服务对象在 apply 时一次性取出。回调里再走 `ctx.<service>`
  // 会撞上「inactive context」，在桌面壳里会升级成启动失败。
  const sessions = ctx.get('sessions') as unknown as SessionsLike | undefined
  const uiSession = ctx.get('uiSession') as unknown as UiSessionLike | undefined
  const remote = ctx.get('remote') as unknown as RemoteLike | undefined
  // 组合可能缺少会话控制器或 ui-session（自定义 profile）：此时插件退化为只有
  // 设置卡，绝不抛错——client 入口抛错会让桌面壳判定启动失败。
  if (sessions === undefined || typeof sessions.list?.getSnapshot !== 'function') return
  if (uiSession === undefined || typeof uiSession.sessionStatus?.subscribe !== 'function') return

  /** 已发出的通知（按会话）：既用于替换，也持有引用防 GC。 */
  const live = new Map<string, { notification: Notification; at: number }>()
  /** 各类去重表。 */
  const lastTurnAt = new Map<string, number>()
  const lastErrorAt = new Map<string, number>()
  /** 上一条已通知的会话级时间（避免 completionUnread 与 running 边沿双发）。 */
  const lastNotifiedAt = new Map<string, number>()
  /** 上一次观测到的 running / pendingInteraction key。 */
  const running = new Map<string, boolean | undefined>()
  const pendingKeys = new Map<string, string>()
  /** 会话标题与子代理标记的最后已知值：行被移除后（会话结束）仍要用它们判定。 */
  const knownLabels = new Map<string, string>()
  const knownSubagent = new Map<string, boolean>()
  const platform = platformOf()
  /** 首次快照只建基线，不为历史状态补通知。 */
  let baselined = false

  const snapshotOf = (): { ids: string[]; byId: Record<string, SessionRowLike> } => sessions.list.getSnapshot()

  /**
   * 记住一行的身份信息。会话被移除后 `byId` 里就没有它了，而「子代理不该弹」
   * 与「正文用会话名」这两条判定都要在移除之后继续成立，所以标记必须落缓存。
   */
  const rememberRow = (sessionId: string): void => {
    const row = snapshotOf().byId[sessionId]
    if (row === undefined) return
    const label = sessionLabelOf(row.title ?? row.displayTitle)
    if (label !== undefined) knownLabels.set(sessionId, label)
    knownSubagent.set(sessionId, row.origin === 'subagent')
  }

  /** 会话身份标签：标题 → 最后已知标题 → 短 id（用户至少能分辨是哪一个）。 */
  const labelOf = (sessionId: string): string => {
    rememberRow(sessionId)
    return knownLabels.get(sessionId) ?? sessionId.slice(0, 8)
  }

  const isSubagent = (sessionId: string): boolean => {
    rememberRow(sessionId)
    return knownSubagent.get(sessionId) === true
  }
  const isMainView = (sessionId: string): boolean =>
    (snapshotOf().byId[sessionId]?.retainedBy?.mainView ?? 0) > 0

  /** 免打扰：审批 / 提问 / 出错属阻塞性或故障类，不受免打扰限制。 */
  const quietNow = (kind: NoticeKind, cfg: NotifyConfig): boolean => {
    if (!cfg.quietHours) return false
    if (kind === 'approval' || kind === 'question' || kind === 'error') return false
    const start = parseClockMinutes(cfg.quietStart)
    const end = parseClockMinutes(cfg.quietEnd)
    if (start === undefined || end === undefined) return false
    const now = new Date()
    return quietHoursActive(now.getHours() * 60 + now.getMinutes(), start, end)
  }

  /** 类别开关。 */
  const kindEnabled = (kind: NoticeKind, cfg: NotifyConfig): boolean => {
    switch (kind) {
      case 'approval': return cfg.approval
      case 'question': return cfg.question
      case 'turn': return cfg.turn
      case 'sessionDone': return cfg.sessionDone
      case 'error': return cfg.error
      case 'subagent': return cfg.subagent
      default: return false
    }
  }

  /** 丢掉一条通知的持有引用。 */
  const release = (sessionId: string): void => { live.delete(sessionId) }

  /** 策略过滤 + 真投递。所有失败静默。 */
  const notify = (notice: Notice): void => {
    try {
      if (typeof Notification === 'undefined') return
      if (Notification.permission !== 'granted') return
      const cfg = runtime.config()
      if (!cfg.enabled) return
      // 子代理会话只由 subagent 开关决定：主开关不能把子代理刷屏一起放出来。
      const kind: NoticeKind = isSubagent(notice.sessionId) && notice.kind !== 'subagent'
        ? 'subagent'
        : notice.kind
      if (!kindEnabled(kind, cfg)) return
      if (quietNow(kind, cfg)) return

      // 同一会话的新通知替换旧卡（tag 相同由系统合并，这里再显式关掉上一条，
      // 两条路径互为兜底：Windows 不发 tag，只能靠 close）。
      const previous = live.get(notice.sessionId)
      if (previous !== undefined) {
        try { previous.notification.close() } catch { /* 已关闭 */ }
        release(notice.sessionId)
      }
      const tag = notificationTagOf(platform, notice.sessionId)
      const notification = new Notification(notice.title, {
        body: notice.body,
        ...(tag === undefined ? {} : { tag }),
        silent: !cfg.sound,
        // 审批与提问是阻塞性的：留在通知中心等用户处理，其余自动消失。
        requireInteraction: kind === 'approval' || kind === 'question',
      })
      live.set(notice.sessionId, { notification, at: Date.now() })
      notification.onclick = () => {
        release(notice.sessionId)
        try { window.focus() } catch { /* 浏览器可能拒绝聚焦 */ }
        try { sessions.open(notice.sessionId) } catch { /* 会话已销毁 */ }
        try { notification.close() } catch { /* 已关闭 */ }
      }
      notification.onclose = () => { release(notice.sessionId) }
      notification.onerror = () => { release(notice.sessionId) }
      lastNotifiedAt.set(notice.sessionId, Date.now())
    } catch {
      // 构造失败（权限被撤销、平台不支持）：静默，通知是增益不是依赖。
    }
  }

  /** 清理过期条目（onclose 未必到达，去重表也必须逐事件收敛）。 */
  const sweep = (): void => {
    const now = Date.now()
    for (const [key, entry] of live) {
      if (now - entry.at >= HOLD_MS) live.delete(key)
    }
    pruneExpired(lastTurnAt, now, TURN_DEDUP_MS)
    pruneExpired(lastErrorAt, now, ERROR_DEDUP_MS)
    pruneExpired(lastNotifiedAt, now, HOLD_MS)
  }

  /**
   * 会话完成的公共判定：只要用户**没有正看着这个会话**就提醒。
   *   - 运行时已判定（`completionUnread`）= 后台会话跑完了，直接提醒；
   *   - 否则看「窗口是否在前台」：切到别的 App / 最小化时也要提醒；
   *   - 再看「主视图是不是这个会话」：正看着 A 而 B 跑完，B 必须提醒。
   * 三者取或：只要有一条说明用户看不见它，就不算打扰。
   */
  const shouldNotifyCompletion = (sessionId: string, completionUnread: boolean): boolean =>
    completionUnread || !watchingNow() || !isMainView(sessionId)

  /** 正文：摘要关闭时只给会话标签，不把内容带到横幅上。 */
  const bodyWith = (cfg: NotifyConfig, label: string, detail: string): string => bodyOf(cfg, label, detail)

  /** 轮次完成（含子代理）：带 5s 去重。 */
  const notifyTurn = (sessionId: string): void => {
    const now = Date.now()
    if (now - (lastTurnAt.get(sessionId) ?? 0) < TURN_DEDUP_MS) return
    lastTurnAt.set(sessionId, now)
    const subagent = isSubagent(sessionId)
    notify({
      kind: subagent ? 'subagent' : 'turn',
      sessionId,
      title: runtime.t(subagent ? 'titleSubagent' : 'titleTurn'),
      body: bodyWith(runtime.config(), labelOf(sessionId), runtime.t('bodyTurn')),
    })
  }

  /** 第一次拿到快照时只记录基线，不为已经发生的状态补通知。 */
  const baseline = (snapshot: ReadonlyMap<string, StatusLike>): void => {
    for (const [sessionId, status] of snapshot) {
      running.set(sessionId, status.running)
      const key = status.pendingInteraction?.key
      if (key !== undefined) pendingKeys.set(sessionId, key)
      labelOf(sessionId)
    }
  }

  // ── 1. 会话状态：轮次结束 / 审批 / 提问 ──────────────────────────────────
  ctx.effect(() => uiSession.sessionStatus.subscribe(() => {
    try {
      sweep()
      const snapshot = uiSession.sessionStatus.getSnapshot()
      if (!baselined) {
        baselined = true
        baseline(snapshot)
        return
      }
      const cfg = runtime.config()
      for (const [sessionId, status] of snapshot) {
        // 审批 / 提问：以 pendingInteraction 的 key 变化为「新请求」判据，
        // 同一个请求在快照里持续存在时不会重复通知。
        const pending = status.pendingInteraction
        if (pending === undefined) {
          pendingKeys.delete(sessionId)
        } else if (pending.key !== pendingKeys.get(sessionId)) {
          pendingKeys.set(sessionId, pending.key)
          if (cfg.enabled) notify(pendingNotice(sessionId, pending, labelOf, runtime, cfg))
        }
        // 轮次结束：running → idle，或从未观测到 running 但 completionUnread 置位。
        const previous = running.get(sessionId)
        running.set(sessionId, status.running)
        const ended = isTurnEnd(previous, status.running)
        const backgrounded = status.completionUnread === true
          && previous === undefined
          && Date.now() - (lastNotifiedAt.get(sessionId) ?? 0) >= TURN_DEDUP_MS
        if ((ended || backgrounded) && shouldNotifyCompletion(sessionId, status.completionUnread === true)) {
          notifyTurn(sessionId)
        }
      }
    } catch { /* 观察失败静默 */ }
  }), 'dsh-notify: session status subscription')

  // ── 2. 会话错误 ─────────────────────────────────────────────────────────
  if (remote !== undefined && typeof remote.$on === 'function') {
    ctx.effect(() => remote.$on('api-session/error', (sessionId, message) => {
      try {
        const cfg = runtime.config()
        const now = Date.now()
        const detail = summaryOf(message, BODY_MAX) || runtime.t('bodyUnknownError')
        const key = errorDedupKey(sessionId, detail)
        pruneExpired(lastErrorAt, now, ERROR_DEDUP_MS)
        if (now - (lastErrorAt.get(key) ?? 0) < ERROR_DEDUP_MS) return
        lastErrorAt.set(key, now)
        notify({
          kind: 'error',
          sessionId,
          title: runtime.t('titleError'),
          body: bodyWith(cfg, labelOf(sessionId), detail),
        })
      } catch { /* 观察失败静默 */ }
    }), 'dsh-notify: session error subscription')
  }

  // ── 3. 会话被移除 = 会话完成 ─────────────────────────────────────────────
  ctx.effect(() => {
    let previous = new Set<string>(snapshotOf().ids)
    return sessions.list.subscribe(() => {
      try {
        const next = new Set<string>(snapshotOf().ids)
        // 先刷新仍在列表里的行的身份标记，被移除的那些才能靠缓存判定。
        for (const id of next) rememberRow(id)
        for (const lost of previous) {
          if (next.has(lost)) continue
          const label = labelOf(lost)
          running.delete(lost)
          pendingKeys.delete(lost)
          // 子代理不在这里拦：`notify` 会把它的类别归一成 `subagent`，由该开关决定。
          notify({
            kind: 'sessionDone',
            sessionId: lost,
            title: runtime.t('titleSessionDone'),
            body: bodyWith(runtime.config(), label, runtime.t('bodySessionDone')),
          })
        }
        previous = next
      } catch { /* 观察失败静默 */ }
    })
  }, 'dsh-notify: session list subscription')
}

/** 正文：摘要关闭时只给会话标签，不把内容带到横幅上。 */
function bodyOf(cfg: NotifyConfig, label: string, detail: string): string {
  if (!cfg.summary) return label
  return detail === '' ? label : summaryOf(`${label} · ${detail}`, BODY_MAX)
}

/** 审批 / 提问通知的组装（两类共用一个入口，判别在 `pending.kind`）。 */
function pendingNotice(
  sessionId: string,
  pending: { kind: string; key: string; sessionId: string },
  labelOf: (id: string) => string,
  runtime: NotifyRuntime,
  cfg: NotifyConfig,
): Notice {
  const label = labelOf(sessionId)
  const bodyWith = (detail: string): string => bodyOf(cfg, label, detail)

  if (pending.kind === 'approval') {
    const request = pending as unknown as {
      toolName?: string
      reason?: string
      displayReason?: unknown
    }
    const tool = typeof request.toolName === 'string' && request.toolName !== ''
      ? request.toolName
      : runtime.t('approvalToolFallback')
    const detail = approvalDetailOf(request, runtime.activeLocale())
    return {
      kind: 'approval',
      sessionId,
      title: runtime.t('titleApproval'),
      body: bodyWith(detail === undefined ? tool : `${tool} · ${detail}`),
    }
  }
  const question = pending as unknown as {
    kind?: string
    questions?: readonly { question?: string }[]
  }
  const first = question.kind === 'plan-review'
    ? runtime.t('questionPlanReview')
    : (typeof question.questions?.[0]?.question === 'string' ? question.questions[0].question : '')
  return {
    kind: 'question',
    sessionId,
    title: runtime.t('titleQuestion'),
    body: bodyWith(summaryOf(first, BODY_MAX)),
  }
}
