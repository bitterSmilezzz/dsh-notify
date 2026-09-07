/**
 * dsh-notify — session deep-link.
 *
 * 系统通知点击后打开 `/?token=...#session=<id>`（host 已用官方
 * authenticatedUrl 带上进程 token，token 交换的 303 重定向会保留 fragment，
 * 首次访问即种 cookie 并直达本页），这里读取 fragment 并跳转到对应会话；
 * 同时兼容旧版 `?session=<id>` 查询参数形态。
 *
 * 入口有两处，共用同一 attempt 逻辑：
 *   - 页面加载（首次访问直达）；
 *   - hashchange（已开标签点击通知、粘贴 `#session=` URL——URL 仅 fragment
 *     变化不触发加载，必须监听 hashchange 重入；hash 不含 session 时为 no-op）。
 *
 * 失败不静默：会话在超时内未出现 / open 抛错 / 订阅失败时保留 URL（刷新可
 * 重试）并用 console.warn 给出可见提示（client 侧无 toast 机制，console
 * 是改动最小的可见通道）。
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
 *
 * 加载与 hashchange 共用 attempt：新尝试先回收上一次的等待（幂等），
 * hash 里没有 session 时 attempt 直接 no-op。effect 的 disposer 同时
 * 移除 hashchange 监听并回收在途等待，随 client fiber 卸载。
 * @param ctx - client root context。
 */
export function applySessionDeepLink(ctx: ClientContext): void {
  ctx.effect(() => {
    // sessions 是可选依赖：不 declare inject（设置卡片等核心功能不依赖会话
    // 控制器，硬注入会让整个 client 半区等它就绪），运行期经 ctx.get 读取。
    // 缺失/未挂载时防御性退出，不清理 URL：服务恢复后下次加载仍有机会跳转。
    const sessions = ctx.get('sessions') as unknown as SessionsLinkLike | undefined
    if (typeof sessions?.open !== 'function' || typeof sessions?.list?.subscribe !== 'function' || typeof sessions?.list?.getSnapshot !== 'function') {
      return () => {}
    }
    /** 打开会话并清除 deep-link 痕迹。open 失败（会话已销毁等）不清 URL：
     *  保留痕迹让用户可刷新/重试，console.warn 给出可见提示（不静默落首页）。 */
    const openAndClear = (sid: string): void => {
      try {
        sessions.open(sid)
      } catch {
        console.warn(`[dsh-notify] 会话 ${sid} 打开失败：URL 已保留，刷新可重试`)
        return
      }
      clearSessionParam()
    }
    // 在途等待（timer + 订阅）的回收句柄；attempt 重入时先回收再新建。
    let inFlight: (() => void) | undefined
    /** 尝试处理当前地址里的 deep-link。 */
    const attempt = (): void => {
      inFlight?.()
      inFlight = undefined
      const sessionId = sessionIdFromLocation(window.location.search, window.location.hash)
      if (sessionId === null) return
      // 会话已就绪则立即打开；否则订阅列表，命中即开，超时放弃。
      if (sessions.list.getSnapshot().byId?.[sessionId] !== undefined) {
        openAndClear(sessionId)
        return
      }
      // 先声明后赋值：subscribe 同步抛错时 unsub 停在未初始化（TDZ），timer
      // 回调若直接访问会 ReferenceError；用可选链/守卫消除（见 timer 回调）。
      let unsub: (() => void) | undefined
      const timer = window.setTimeout(() => {
        // 防御：subscribe 同步抛错 → unsub 未赋值，放弃等待且不清理 URL。
        if (unsub === undefined) return
        unsub()
        unsub = undefined
        // 超时放弃不清 URL：保留痕迹（刷新/再次点击可重试），console 可见提示。
        console.warn(`[dsh-notify] 会话 ${sessionId} 未在 ${LINK_TIMEOUT_MS / 1000}s 内出现：URL 已保留，刷新可重试`)
      }, LINK_TIMEOUT_MS)
      try {
        unsub = sessions.list.subscribe(() => {
          if (sessions.list.getSnapshot().byId?.[sessionId] === undefined) return
          clearTimeout(timer)
          if (unsub !== undefined) unsub()
          openAndClear(sessionId)
        })
      } catch {
        // subscribe 同步抛错：观察链建立失败，立即放弃（不再空等 timer），
        // 不清 URL（保留可重试），console 可见提示；不抛给 fiber。
        clearTimeout(timer)
        console.warn(`[dsh-notify] 订阅会话列表失败：URL 已保留，刷新可重试`)
        return
      }
      inFlight = () => {
        clearTimeout(timer)
        if (unsub !== undefined) unsub()
      }
    }
    // 首次加载立即尝试；此后 fragment 变化（已开标签点击通知、粘贴
    // `#session=` URL）重入同一逻辑。hash 不含 session 时 attempt 为 no-op。
    attempt()
    window.addEventListener('hashchange', attempt)
    return () => {
      window.removeEventListener('hashchange', attempt)
      inFlight?.()
    }
  }, 'dsh-notify: session deep-link')
}
