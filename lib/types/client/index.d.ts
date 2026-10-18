/**
 * dsh-notify — browser half entry (single fiber).
 *
 * 组合：通知控制器（Web Notification 通道，见 notifications.ts）、设置卡片、
 * URL deep-link。配置由 host Config 持有（config.ts）。
 *
 * 设置卡片注册到官方 `plugins.bundle.config` 契约（插件详情页）。旧契约
 * `settings.plugin.item` 已在 dsh 0.1.6-alpha.2 退役（commit 90af3110b7），
 * 不再注册（见 settings-card.tsx）。用 `slots.inject` 注册——未声明该 slot
 * 的部署里 inject 只是等待，不会报错。
 *
 * activation safety：所有服务在 apply 顶层一次性取出。回调里再走
 * `ctx.<service>` 会撞上「inactive context」并被桌面壳视为致命启动失败。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { zh, en } from './locales.ts';
export { zh, en };
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
export declare const name = "dsh-notify";
//# sourceMappingURL=index.d.ts.map