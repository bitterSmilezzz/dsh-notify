/**
 * dsh-notify — session deep-link.
 *
 * 系统通知点击后打开 `/?session=<id>`，这里读取参数并跳转到对应会话。
 * 会话列表就绪后执行（首次加载可能还没到），成功后清除 URL 参数避免刷新
 * 重复跳转。用 store 订阅而非轮询，带超时上限防止无效 id 无限等待。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'

/** deep-link 等待会话出现的最大时长（毫秒）。 */
const LINK_TIMEOUT_MS = 15_000

/** sessions 服务的最小面（仅 deep-link 需要）。 */
interface SessionsLinkLike {
  open(sid: string): void
  list: { subscribe(listener: () => void): () => void; getSnapshot(): { byId: Record<string, unknown> } }
}

/**
 * 处理 ?session= deep-link。
 * @param ctx - client root context。
 */
export function applySessionDeepLink(ctx: ClientContext): void {
  ctx.effect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session')
    if (sessionId === null || sessionId === '') return () => {}
    const sessions = ctx.sessions as unknown as SessionsLinkLike

    const clearParam = (): void => {
      const url = new URL(window.location.href)
      url.searchParams.delete('session')
      window.history.replaceState({}, '', url)
    }
    // 会话已就绪则立即打开；否则订阅列表，命中即开，超时放弃。
    if (sessions.list.getSnapshot().byId[sessionId] !== undefined) {
      sessions.open(sessionId)
      clearParam()
      return () => {}
    }
    const timer = window.setTimeout(() => {
      unsub()
      clearParam()
    }, LINK_TIMEOUT_MS)
    const unsub = sessions.list.subscribe(() => {
      if (sessions.list.getSnapshot().byId[sessionId] === undefined) return
      clearTimeout(timer)
      unsub()
      sessions.open(sessionId)
      clearParam()
    })
    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, 'dsh-notify: session deep-link')
}
