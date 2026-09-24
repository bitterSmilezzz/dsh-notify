/**
 * dsh-notify — 通知门控纯函数。
 *
 * 不含任何 I/O 与平台依赖，以便 node --test 直接覆盖：subagent 会话不打扰、
 * 通知正文可读、正文会话身份（会话标题 / 模型名）与 error 去重指纹，都是
 * 可独立判定的纯逻辑。
 */

/** 单行化 + 限长（≤max 码点，尾部 …）。按码点截断而非 UTF-16 code unit：
 *  slice 可能切在代理对中间产生孤立代理（半个 emoji 渲染成 �），
 *  用 Array.from 按码点展开后再截，代理对不会被劈开。但码点不等于字素簇：
 *  基字符+变音符组合（如 á = a + U+0301）与 ZWJ emoji 序列仍可能恰在边界被
 *  劈开——截断语义按码点计，仅影响尾部展示，不影响可读性判定。
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
 * 从 agent 载荷读取会话身份标签：优先 `options.model`（AgentOptions 的
 * 模型 id），缺失时回落 `options.provider`。两者都是可选字符串，运行时
 * 旧版协议/畸形 payload 可能连 `options` 都没有——结构化读取，取不到一律
 * 返回 undefined（调用方回落固定文案），绝不抛错（通知是增益不是依赖）。
 */
export function agentModelLabel(agent: unknown): string | undefined {
  const options = (agent as { options?: { model?: unknown; provider?: unknown } } | null | undefined)?.options
  const model = options?.model
  const provider = options?.provider
  if (typeof model === 'string' && model !== '') return model
  if (typeof provider === 'string' && provider !== '') return provider
  return undefined
}

/**
 * error 去重指纹：agent id + 消息文本（截断拼接，确定性、无散列依赖）。
 * 同一 agent 的同一错误在去重窗口内只通知一次；不同错误（消息不同）在同一
 * 窗口内各自通知——用户修复后窗口内出现的新错误不再被旧去重键吞掉。
 * 截断只限制极长消息的键长（Map 条目只在窗口内活跃，大小受窗口约束）。
 */
export function errorDedupKey(agentId: string, message: string): string {
  return `${agentId}\u0001${message.slice(0, 128)}`
}

/**
 * 本地化字典取词：`LocalizedText`（`{ en, [locale] }`），解析顺序
 * 精确 locale 键 → 主子标签键 → `en` → 字典首个非空值。
 *
 * 与官方 `locale.resolveText` 的关系：**同向但有两处刻意差异**（host 半区拿不到
 * 官方 LocaleFace，只能自实现，先记录差异免得日后误以为完全等价）：
 * 1. 官方链是「当前 locale（含其声明 fallback，如 zh→en）逐级 `??` 回落」，
 *    且**空串是合法翻译**（`??` 不跳过空串）；这里把空串视作缺失继续回落——
 *    通知正文出现空白条目等于没通知，落到 en 比展示空文本好。
 * 2. 官方链按 LocaleDefinition 的 fallback 声明走（当前只有 zh→en 一条）；
 *    这里简化为「主子标签 → en」，因为 displayReason 的键由各 asker 自填，
 *    不受声明链约束。差异只在「空翻译」与「非声明链 locale」两种边角生效。
 * 两者共同点是绝不抛错：畸形字典（null / 空值 / 非字符串值）一律继续回落。
 *
 * DSH rc.2 起审批事件带 `displayReason`（本地化提示文本，`reason` 是审计用
 * 原始文本）：通知是给用户读的，应优先展示本地化版本。
 * @param dict - displayReason 字典（运行时可能缺失或畸形）。
 * @param preference - locale settings 的 preference 字段（如 `zh-CN`）。
 */
export function localizedTextOf(dict: unknown, preference: unknown): string | undefined {
  if (typeof dict === 'string') return dict === '' ? undefined : dict
  if (typeof dict !== 'object' || dict === null) return undefined
  const table = dict as Record<string, unknown>
  const en = typeof table.en === 'string' ? table.en : ''
  if (typeof preference !== 'string') return en !== '' ? en : firstNonEmpty(table)
  const normalized = preference.trim().toLowerCase()
  const primary = normalized.split(/[-_]/u, 1)[0] ?? ''
  if (primary === '') return en !== '' ? en : firstNonEmpty(table)
  // 精确 locale 键（`zh-tw`）优先于主子标签键（`zh`）——键名统一小写后比较。
  const exact = table[normalized]
  if (typeof exact === 'string' && exact !== '') return exact
  const byPrimary = table[primary]
  if (typeof byPrimary === 'string' && byPrimary !== '') return byPrimary
  return en !== '' ? en : firstNonEmpty(table)
}

/** 字典里第一个非空字符串值（en 也缺失时的最后兜底，迭代顺序不确定但不抛错）。 */
function firstNonEmpty(table: Record<string, unknown>): string | undefined {
  for (const value of Object.values(table)) {
    if (typeof value === 'string' && value !== '') return value
  }
  return undefined
}

/**
 * 审批通知正文取词：优先 `displayReason`（本地化提示，rc.2 新增），缺失时
 * 回落 `reason`（审计用原始文本，旧版协议与只填 reason 的 asker 都走这条）。
 * 返回 undefined 表示两者都不可用（调用方只展示 toolName）。
 */
export function approvalDetailOf(req: {
  reason?: string
  displayReason?: unknown
} | null | undefined, preference: unknown): string | undefined {
  if (req == null) return undefined
  const localized = localizedTextOf(req.displayReason, preference)
  if (localized !== undefined && localized !== '') return localized
  return typeof req.reason === 'string' && req.reason !== '' ? req.reason : undefined
}

/**
 * 会话身份标签：优先会话标题（用户认得），回落 `options.model`（模型 id）。
 * 两者都是可选字符串——运行时旧版协议/畸形 payload 取不到一律返回
 * undefined，调用方回落固定文案，绝不抛错（通知是增益不是依赖）。
 * @param title - 官方 sessionTitle 服务折叠出的标题（可为空串）。
 * @param agent - agent 载荷（读 options.model / options.provider）。
 */
export function sessionLabelOf(title: string | undefined | null, agent: unknown): string | undefined {
  if (typeof title === 'string' && title !== '') return title
  return agentModelLabel(agent)
}
