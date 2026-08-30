/**
 * dsh-notify — 通知门控纯函数。
 *
 * 从 system-notify.ts 原样搬出，不含任何 I/O 与平台依赖，以便 node --test
 * 直接覆盖：这两条判定正是「subagent 会话不打扰」与「通知正文可读」的实现点。
 */

/** 单行化 + 限长（≤max 字符，尾部 …）。 */
export function summaryOf(text: string | undefined, max = 120): string {
  if (text === undefined || text === '') return ''
  const oneLine = text.replace(/\s+/gu, ' ').trim()
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, Math.max(1, max - 1))}…`
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
