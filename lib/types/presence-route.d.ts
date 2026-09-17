/**
 * dsh-notify — 聚焦上报路由（host 侧）。
 *
 * 浏览器半区把页面可见性 POST 到 `/api/dsh-notify/presence`（同源、带 cookie），
 * host 记录后用于抑制非阻塞通知（见 presence.ts / notify-events.ts）。
 *
 * 为什么不用官方 `connection.rpc.handle`（逻辑 RPC 通道）：它内部用
 * `owner.webServer.register(...)` 挂 prefix route，而 owner 的 `ctx` 语义在
 * traceable proxy 下解析不到调用者声明的 `webServer` 依赖——实测即使
 * `ctx.inject(['connection', 'webServer'], …)` 仍抛
 * `cannot get property "webServer" without inject`，注册静默失败。改用官方
 * 明确支持的 `ctx.webServer.register`（exact route），信任围栏直接复用
 * `connection.requestRejection`（与 `/api` 共享通道同一套 Host/Origin 检查 +
 * 浏览器认证），安全语义不变。
 *
 * 协议：POST JSON `{ visible: boolean }`；成功 204；畸形 payload 400；
 * 未认证 401 / 不可信来源 403（官方围栏判定）；其他方法 405。
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
/** 聚焦上报的精确路由（与 client/presence.ts 的常量一一对应）。 */
export declare const PRESENCE_ROUTE = "/api/dsh-notify/presence";
/** 官方信任围栏的判定结果（connection.requestRejection 的返回面）。 */
export type PresenceRejection = 401 | 403 | undefined;
/** 注册聚焦路由所需的注入面（便于测试注入替身，不起真实服务器）。 */
export interface PresenceRouteDeps {
    /** 注册精确路由（生产传 `ctx.webServer.register`）。 */
    register: (route: {
        kind: 'exact';
        path: string;
        handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
    }) => () => void;
    /** 官方信任围栏（生产传 `connection.requestRejection`）。 */
    guard: (req: IncomingMessage) => PresenceRejection;
    /** 收到合法上报时回调（生产传 presence.report）。 */
    report: (visible: boolean) => void;
}
/**
 * 注册聚焦上报路由。所有失败路径都只回状态码、不抛错（通知是增益不是依赖）；
 * handler 内的异常被吞掉并回 500，绝不影响宿主。
 * @param deps - 注册函数、信任围栏与上报回调。
 * @returns 路由 disposer（随 fiber 回收）。
 */
export declare function registerPresenceRoute(deps: PresenceRouteDeps): () => void;
//# sourceMappingURL=presence-route.d.ts.map