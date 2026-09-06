/**
 * dsh-notify — 通知门控纯函数。
 *
 * 从 system-notify.ts 原样搬出，不含任何 I/O 与平台依赖，以便 node --test
 * 直接覆盖：这两条判定正是「subagent 会话不打扰」与「通知正文可读」的实现点。
 */

/** 单行化 + 限长（≤max 字符，尾部 …）。按码点截断而非 UTF-16 code unit：
 *  slice 可能切在代理对中间产生孤立代理（半个 emoji 渲染成 �），
 *  用 Array.from 按码点展开后再截，输出永远是完整字符。
 *  `text == null`（宽松判等）同时覆盖 undefined 与运行时传入的 null——
 *  host 事件 payload 的字段在旧版协议/畸形数据下可能为 null，绝不能抛错
 *  （通知是增益不是依赖）。 */
export function summaryOf(text: string | undefined | null, max = 120): string {
  if (text == null || text === '') return ''
  const oneLine = text.replace(/\s+/gu, ' ').trim()
  if (oneLine.length <= max) return oneLine
  const cut = Array.from(oneLine).slice(0, Math.max(1, max - 1))
  return `${cut.join('')}…`
}

/**
 * 清理去重 Map 的过期条目。每次事件都先清一遍（不只等 size 到上限）：
 * Map 只保留窗口内的活跃记录，长期运行后不会堆积过期条目；Map 大小
 * 等于窗口内活跃 agent 数（通常个位数），逐条遍历开销可忽略。
 * 纯函数，导出供 node --test 直接覆盖（与 I/O 无关）。
 */
export function pruneExpired(map: Map<string, number>, now: number, windowMs: number): void {
  for (const [id, at] of map) {
    if (now - at >= windowMs) map.delete(id)
  }
}

/**
 * subagent 会话过滤：SessionHeader.origin === 'subagent'（dsh-session 官方判定，
 * 如 session-controller history.js）。subagent 也会打 agent/status/error/disposed
 * 全局事件——通知噪音且深链指向会话列表没有的 id（client 空等超时，点击无响应）。
 * 结构化读取：类型面不可达时 undefined 一律视为主会话（行为与旧版一致）。
 */
export function isSubagent(agent: unknown): boolean {
  const origin = (agent as { session?: { header?: { origin?: unknown } } } | null | undefined)?.session?.header?.origin
  return origin === 'subagent'
}

/**
 * 通知事件适配层：事件名集中映射，通知逻辑只依赖语义层。
 * 官方未来若改事件名/签名，只改这一处映射，监听器与测试不动。
 */
export const NOTIFY_EVENTS = {
  /** 轮次完成（running → idle）。 */
  turnDone: 'agent/status',
  /** 审批请求（waterfall 事件，必须 next() 委托）。 */
  approval: 'approval/request',
  /** Agent 出错。 */
  error: 'agent/error',
  /** 会话完成（agent 销毁）。 */
  sessionDone: 'agent/disposed',
} as const

/**
 * 其他通知源（官方/生态）的能力探测：候选 cordis service 名单。
 * 只探测 service 名，不做事件探测（无法区分"未发生"与"不存在"）、
 * 不做 HTTP 路由探测（无法枚举且撞路由是另一类问题）。名单可配置扩展
 * （settings `probeServices` 追加），内置值为通用命名惯例。
 */
export const PROBE_SERVICE_NAMES = [
  'notification',
  'notifications',
  'notifyCenter',
  'desktopNotify',
  'systemNotify',
  'toast',
] as const

/**
 * 探测结果。
 * @param official - 是否探测到其他通知源。
 * @param source - 命中的 service 名（诊断展示用；未命中时为 undefined）。
 */
export interface ProbeState {
  official: boolean
  source?: string
}

/**
 * 探测 ctx 上是否存在其他通知源（纯判定，无 I/O）。
 * 规则：逐个候选名 `get(name)`，返回非 undefined 即命中（dsh-notify 自身
 * 不注册任何 service，天然不会自撞；命中即视为"官方/生态已接管"）。
 * @param ctxLike - 仅需要 get 面的上下文（测试注入假对象）。
 * @param extra - 配置追加的候选名（去重后接在内置名单之后）。
 */
export function probeOfficialNotify(ctxLike: { get(name: string): unknown }, extra?: readonly string[]): ProbeState {
  for (const name of [...PROBE_SERVICE_NAMES, ...(extra ?? [])]) {
    try {
      if (ctxLike.get(name) !== undefined) return { official: true, source: name }
    } catch {
      // get 抛错（服务尚未就绪的边界态）视为未命中，绝不外抛——通知是增益。
    }
  }
  return { official: false }
}
