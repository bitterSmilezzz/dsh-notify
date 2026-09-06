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
// Type-only: keeps the session controller in the type graph (the sessions
// service this module reads via ctx.get, not a hard inject).
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

/** 清除 deep-link 痕迹（fragment 与查询参数），避免刷新重复跳转。
 *  hash 用 URLSearchParams 解析而非 startsWith 前缀判断：`#session=` 可能
 *  不在 hash 首位（如 `#foo=1&session=abc`），前缀判断会漏清导致刷新重复跳转。 */
export function clearSessionParam(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('session')
  const hashParams = new URLSearchParams(url.hash.replace(/^#/u, ''))
  if (hashParams.has('session')) {
    hashParams.delete('session')
    url.hash = hashParams.size > 0 ? `#${hashParams.toString()}` : ''
  }
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
    // sessions 是可选依赖：不 declare inject（设置卡片等核心功能不依赖会话
    // 控制器，硬注入会让整个 client 半区等它就绪），运行期经 ctx.get 读取。
    // 缺失/未挂载时防御性退出，不清理 URL：服务恢复后下次加载仍有机会跳转。
    const sessions = ctx.get('sessions') as unknown as SessionsLinkLike | undefined
    if (typeof sessions?.open !== 'function' || typeof sessions?.list?.subscribe !== 'function' || typeof sessions?.list?.getSnapshot !== 'function') {
      return () => {}
    }
    /** 打开会话并清除 deep-link 痕迹。open 失败（会话已销毁等）也清：URL 残留会导致每次刷新重复空等。 */
    const openAndClear = (): void => {
      try {
        sessions.open(sessionId)
      } catch {
        /* 打开失败：静默降级，痕迹照常清除 */
      }
      clearSessionParam()
    }
    // 会话已就绪则立即打开；否则订阅列表，命中即开，超时放弃。
    if (sessions.list.getSnapshot().byId?.[sessionId] !== undefined) {
      openAndClear()
      return () => {}
    }
    // 先声明后赋值：subscribe 同步抛错时 unsub 停在未初始化（TDZ），timer
    // 回调若直接访问会 ReferenceError；用可选链/守卫消除（见 timer 回调）。
    let unsub: (() => void) | undefined
    const timer = window.setTimeout(() => {
      // 防御：subscribe 同步抛错 → unsub 未赋值，放弃等待且不清理 URL
      //（URL 保留，刷新可重试；与 sessions 缺失时的行为一致）。
      if (unsub === undefined) return
      unsub()
      clearSessionParam()
    }, LINK_TIMEOUT_MS)
    try {
      unsub = sessions.list.subscribe(() => {
        if (sessions.list.getSnapshot().byId?.[sessionId] === undefined) return
        clearTimeout(timer)
        unsub?.()
        openAndClear()
      })
    } catch {
      // subscribe 同步抛错：观察链建立失败，立即放弃（不再空等 timer），
      // 不抛给 fiber——通知/深链是增益不是依赖。
      clearTimeout(timer)
      return () => {}
    }
    return () => {
      clearTimeout(timer)
      if (unsub !== undefined) unsub()
    }
  }, 'dsh-notify: session deep-link')
}
