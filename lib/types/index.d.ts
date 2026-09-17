/**
 * dsh-notify — host half（组合器）。
 *
 * 监听 Cordis 事件发系统桌面通知（平台通道见 system-notify.ts，事件编排见
 * notify-events.ts），点击通知跳转浏览器对应会话（client 半区的 deep-link
 * 读取 `#session=`）。
 *
 * 配置契约：host settings namespace `notify` 为权威源（client 设置卡片与
 * host 通知逻辑共享同一配置）：
 *   - notify: { enabled, approval, turn, sessionDone, error, sound }
 *
 * 聚焦感知：client 半区经官方 Connection RPC 通道上报页面可见性，可见时
 * 抑制「轮次完成 / 会话完成」这类非阻塞通知（见 notify-events.ts 分级说明）。
 *
 * inject 为最小集：settings（注册 namespace + 读取通知开关）。connection /
 * sessionTitle / webServer 都是可选能力，一律 `ctx.get` / scoped inject 读取，
 * 缺失时优雅降级（通知是增益不是依赖）。
 */
import type { Context } from '@deepseek-ai/cordis';
/** 插件配置页的 settings namespace：注册后出现在「设置 → 插件 → 配置」分派列表。 */
export declare const NOTIFY_SETTINGS_NAMESPACE = "notify";
export declare const name = "dsh-notify";
export declare const inject: string[];
export declare function apply(ctx: Context, _config?: Record<string, never>): void;
//# sourceMappingURL=index.d.ts.map