/**
 * dsh-notify — settings card (settings.plugin.item / plugins.bundle.config).
 *
 * 一张卡片同时服务两代官方契约（DSH 0.1.6 期间换过插件配置架构）：
 *   - 旧契约 `settings.plugin.item`（keyed by settings namespace）：渲染在
 *     「设置 → 插件 → 插件配置」列表里，occupant 自绘折叠外壳（无 view 属性）；
 *   - 新契约 `plugins.bundle.config`（keyed by package name）：渲染在插件详情页
 *     （侧边栏 Plugins 面板 → 本插件 → 配置表单），页面自己画标题/图标/面包屑，
 *     occupant 只按 `view: 'summary' | 'page'` 渲染一行摘要或表单。
 * 两个注册共用本组件；`view` 缺省即旧契约路径（见 client/index.ts）。
 *
 * 开关走 config 快照（host settings 为权威源），拨动即写 host（无暂存/保存步）：
 * 开关的意图是即时的，不存在官方 staged 文本字段那种「未预览的写入」问题。
 */
import * as react from 'react';
import type { LocaleT } from './locale.ts';
/** 官方契约的视图选择；旧契约（settings.plugin.item）不传。 */
export type NotifyCardView = 'summary' | 'page';
/**
 * 通知设置卡片主体。三种渲染路径：
 *   - `view: 'summary'`：插件详情页上的一行摘要；
 *   - `view: 'page'`：插件详情页里的配置表单（官方页面已画标题）；
 *   - 无 `view`：旧契约的折叠卡片（自绘外壳）。
 * @param props.t - locale 绑定（闭包传入）。
 * @param props.view - 官方新契约的视图选择（旧契约不传）。
 */
export declare function NotifySettingsCard({ t, view }: {
    t: LocaleT;
    view?: NotifyCardView | undefined;
}): react.JSX.Element;
//# sourceMappingURL=settings-card.d.ts.map