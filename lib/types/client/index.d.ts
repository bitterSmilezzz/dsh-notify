/**
 * dsh-notify — browser half entry (single fiber).
 *
 * 组合：设置卡片、通知声音、点通知跳会话 deep-link、聚焦上报。
 * 配置由 host settings 服务持有（config.ts）。
 *
 * 设置卡片注册到官方 `plugins.bundle.config` 契约（插件详情页）。旧契约
 * `settings.plugin.item` 已在 dsh 0.1.6-alpha.2 退役（commit 90af3110b7），
 * 不再注册（见 settings-card.tsx）。用 `slots.inject` 注册——未声明该 slot
 * 的部署里 inject 只是等待，不会报错。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { zh, en } from './locales.ts';
export { zh, en };
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
export declare const name = "dsh-notify";
//# sourceMappingURL=index.d.ts.map