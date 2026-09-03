/**
 * dsh-notify — session deep-link.
 *
 * 系统通知点击后打开 `/?token=...#session=<id>`（host 已用官方
 * authenticatedUrl 带上进程 token，token 交换的 303 重定向会保留 fragment，
 * 首次访问即种 cookie 并直达本页），这里读取 fragment 并跳转到对应会话；
 * 同时兼容旧版 `?session=<id>` 查询参数形态。会话列表就绪后执行（首次
 * 加载可能还没到），成功后清除 URL 痕迹避免刷新重复跳转。用 store 订阅
 * 而非轮询，带超时上限防止无效 id 无限等待。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the session controller Context merge (ctx.sessions) in alpha.2.
import type {} from '@deepseek-ai/dsh-api-session-controller/client'

/** deep-link 等待会话出现的最大时长（毫秒）。 */
const LINK_TIMEOUT_MS = 15_000

/** sessions 服务的最小面（仅 deep-link 需要）。 */
interface SessionsLinkLike {
  open(sid: string): void
  list: { subscribe(listener: () => void): () => void; getSnapshot(): { byId: Record<string, unknown> } }
}

/**
 * 从当前地址提取 deep-link 的会话 id：先读 `#session=` fragment（rc.1 token
 * 鉴权后的新形态，303 重定向保留 fragment），再回落 `?session=` 查询参数
 * （旧形态）。两者都缺失或为空时返回 null。
 */
export function sessionIdFromLocation(search: string, hash: string): string | null {
  const fromHash = new URLSearchParams(hash.replace(/^#/u, '')).get('session')
  if (fromHash !== null && fromHash !== '') return fromHash
  const fromQuery = new URLSearchParams(search).get('session')
  return fromQuery !== null && fromQuery !== '' ? fromQuery : null
}

/** 清除 deep-link 痕迹（fragment 与查询参数），避免刷新重复跳转。 */
export function clearSessionParam(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('session')
  if (url.hash.startsWith('#session=')) url.hash = ''
  window.history.replaceState({}, '', url)
}

/**
 * 处理 session deep-link。
 * @param ctx - client root context。
 */
export function applySessionDeepLink(ctx: ClientContext): void {
  ctx.effect(() => {
    const sessionId = sessionIdFromLocation(window.location.search, window.location.hash)
    if (sessionId === null) return () => {}
    const sessions = ctx.sessions as unknown as SessionsLinkLike

    // 会话已就绪则立即打开；否则订阅列表，命中即开，超时放弃。
    if (sessions.list.getSnapshot().byId[sessionId] !== undefined) {
      sessions.open(sessionId)
      clearSessionParam()
      return () => {}
    }
    const timer = window.setTimeout(() => {
      unsub()
      clearSessionParam()
    }, LINK_TIMEOUT_MS)
    const unsub = sessions.list.subscribe(() => {
      if (sessions.list.getSnapshot().byId[sessionId] === undefined) return
      clearTimeout(timer)
      unsub()
      sessions.open(sessionId)
      clearSessionParam()
    })
    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, 'dsh-notify: session deep-link')
}
