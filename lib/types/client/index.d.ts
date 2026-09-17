/**
 * dsh-notify — browser half entry (single fiber).
 *
 * 组合：设置卡片、通知声音、点通知跳会话 deep-link、聚焦上报。
 * 配置由 host settings 服务持有（config.ts）。
 *
 * 设置卡片注册两代官方契约（DSH 0.1.6 期间换过插件配置架构，见
 * settings-card.tsx）：`settings.plugin.item`（旧：设置 → 插件 → 插件配置）
 * 与 `plugins.bundle.config`（新：插件详情页）。两个 slot 都用 `slots.inject`
 * 注册——未声明该 slot 的部署里 inject 只是等待，不会报错，因此双注册在
 * 新旧运行时下都安全。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { zh, en } from './locales.ts';
export { zh, en };
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
export declare const name = "dsh-notify";
//# sourceMappingURL=index.d.ts.map