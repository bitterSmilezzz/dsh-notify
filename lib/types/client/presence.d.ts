/**
 * dsh-notify — 聚焦上报（browser half）。
 *
 * 把「页面是否可见」POST 给 host（`/api/dsh-notify/presence`，同源带 cookie，
 * host 侧用官方 connection.requestRejection 做 Host/Origin + 浏览器认证围栏）；
 * host 据此抑制「轮次完成 / 会话完成」这类非阻塞通知（见 host 侧
 * notify-events.ts 的分级说明）——用户正看着界面时，系统通知是纯噪音。
 *
 * 协议（与 host 侧 presence-route.ts 一一对应）：POST JSON `{ visible: boolean }`，
 * 成功 204、畸形 400、未认证 401。
 *
 * 上报节奏：
 *   - 可见时立即上报一次，并每 30s 续期（host TTL 75s，容忍两次连续丢失）；
 *   - 页面隐藏（切标签/最小化）时立即上报 false 并停止续期；
 *   - 关标签页时 visibilitychange 同样触发（hidden），上报失败也无妨——
 *     host 侧 TTL 一到即恢复通知（宁可多通知，不可静默失效）。
 *
 * 上报失败一律静默：通知是增益不是依赖，链路断掉只会退化成"照常通知"。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/**
 * 挂载聚焦上报：可见性变化时上报，可见期间定时续期。随 client fiber 卸载
 * 回收（移除监听 + 清定时器）。
 * @param ctx - client root context。
 */
export declare function applyPresenceReporting(ctx: ClientContext): void;
//# sourceMappingURL=presence.d.ts.map