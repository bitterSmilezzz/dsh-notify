/**
 * dsh-notify — 会话导航缝（通知点击 / URL deep-link 共用）。
 *
 * 打开一个会话必须走官方导航入口：DSH 0.2 起主视图选择归 `ui-workspace`
 * （`ctx.uiWorkspace.openSession(target)`），`ctx.sessions` 只持有会话代际与
 * 历史，**没有** `open()`——0.1.x 曾有，升级后调用它是 `TypeError`。两侧都包
 * 了 try/catch，所以失败完全静默：窗口被拉到前台、会话却停在原处，正是
 * 「点了通知只跳到 App」的观感来源。
 *
 * 入口在**调用时**解析而不是 apply 时捕获：`ui-workspace` 的激活顺序不保证
 * 早于本插件，`ctx.get` 只在提供方 fiber 处于 ACTIVE 时返回值，缓存一次可能
 * 缓存到 undefined 而永久失效。`ctx.get` 缺服务只返回 undefined、不抛错，可
 * 以在事件回调里安全调用。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'

/**
 * 打开一个会话。
 * @param sessionId - 目标会话 id（来自通知事件或 URL，两侧都是外部输入，故按
 *   字符串接收、交给官方导航自行解析）。
 * @returns `true` 表示已交给官方导航；`false` 表示当前组合没有任何导航入口，
 *   或导航同步抛错（会话已销毁等）。
 */
export type OpenSession = (sessionId: string) => boolean

/** `ctx.uiWorkspace` 的最小面（0.2 起唯一的会话导航入口）。 */
interface UiWorkspaceLike {
  openSession(sessionId: string): void
}

/** `ctx.sessions` 的最小面：0.1.x 的旧导航入口（新版已无此方法）。 */
interface LegacySessionsLike {
  open?: (sessionId: string) => void
}

/**
 * 造一个会话打开器：优先 `uiWorkspace.openSession`，回落旧版
 * `sessions.open`（更早的 DSH 版本），两者都不可用时返回 `false` 而非抛错。
 *
 * @param ctx - client root context（用于运行期解析服务）。
 * @returns 打开器；每次调用都重新解析服务，见模块头的激活顺序说明。
 */
export function createOpenSession(ctx: ClientContext): OpenSession {
  return (sessionId) => {
    const workspace = ctx.get('uiWorkspace') as UiWorkspaceLike | undefined
    if (typeof workspace?.openSession === 'function') {
      try {
        workspace.openSession(sessionId)
        return true
      } catch {
        // 导航被拒绝（会话已销毁、会话列表已淘汰）：按失败上报，调用方保留重试痕迹。
        return false
      }
    }
    const sessions = ctx.get('sessions') as LegacySessionsLike | undefined
    if (typeof sessions?.open === 'function') {
      try {
        sessions.open(sessionId)
        return true
      } catch {
        // 旧入口同样可能在会话销毁后抛错。
        return false
      }
    }
    return false
  }
}
