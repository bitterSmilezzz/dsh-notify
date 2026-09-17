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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/**
 * 从当前地址提取 deep-link 的会话 id：先读 `#session=` fragment（rc.1 token
 * 鉴权后的新形态，303 重定向保留 fragment），再回落 `?session=` 查询参数
 * （旧形态）。两者都缺失或为空时返回 null。
 */
export declare function sessionIdFromLocation(search: string, hash: string): string | null;
/** 清除 deep-link 痕迹（fragment 与查询参数），避免刷新重复跳转。
 *  hash 用 URLSearchParams 解析而非 startsWith 前缀判断：`#session=` 可能
 *  不在 hash 首位（如 `#foo=1&session=abc`），前缀判断会漏清导致刷新重复跳转。 */
export declare function clearSessionParam(): void;
/**
 * 处理 session deep-link。
 *
 * 加载与 hashchange 共用 attempt：新尝试先回收上一次的等待（幂等），
 * hash 里没有 session 时 attempt 直接 no-op。effect 的 disposer 同时
 * 移除 hashchange 监听并回收在途等待，随 client fiber 卸载。
 * @param ctx - client root context。
 */
export declare function applySessionDeepLink(ctx: ClientContext): void;
//# sourceMappingURL=deep-link.d.ts.map