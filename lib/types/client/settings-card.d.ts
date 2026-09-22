/**
 * dsh-notify — settings card (plugins.bundle.config).
 *
 * 渲染在插件详情页（侧边栏 Plugins 面板 → 本插件 → 配置表单）：页面自己画
 * 标题/图标/面包屑，occupant 按 `view: 'summary' | 'page'` 渲染一行摘要或表单。
 * `view` 缺省（如更早的运行时）时退回自绘折叠外壳兜底。旧契约
 * `settings.plugin.item` 已在 dsh 0.1.6-alpha.2 退役（commit 90af3110b7），
 * 不再注册（见 client/index.ts）。
 *
 * 开关走 config 快照（host settings 为权威源），拨动即写 host（无暂存/保存步）：
 * 开关的意图是即时的，不存在官方 staged 文本字段那种「未预览的写入」问题。
 */
import * as react from 'react';
import type { LocaleT } from './locale.ts';
/** 官方契约的视图选择（插件详情页传入）。 */
export type NotifyCardView = 'summary' | 'page';
/**
 * 通知设置卡片主体。三种渲染路径：
 *   - `view: 'summary'`：插件详情页上的一行摘要；
 *   - `view: 'page'`：插件详情页里的配置表单（官方页面已画标题）；
 *   - 无 `view`：自绘折叠外壳兜底（更早的运行时）。
 *
 * ⚠ `view: 'summary'` 当前**不可达**：官方 PluginManagerPage 对
 * `plugins.bundle.config` 只以 `view: 'page'` 渲染（summary 只用于
 * `plugins.item` 座位）。保留它是防御性的（官方哪天在插件列表页也渲染本座位的
 * 摘要，这里就不用改代码），但**不要为它单独维护文案**——`masterDesc` 同时被
 * 无 view 的折叠外壳使用，不会变成死词条。
 *
 * @param props.t - locale 绑定（闭包传入）。
 * @param props.view - 插件详情页传入的视图选择。
 */
export declare function NotifySettingsCard({ t, view }: {
    t: LocaleT;
    view?: NotifyCardView | undefined;
}): react.JSX.Element;
//# sourceMappingURL=settings-card.d.ts.map