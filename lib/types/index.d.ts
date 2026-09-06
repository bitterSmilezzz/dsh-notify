/**
 * dsh-notify — host half（组合器）。
 *
 * 监听 Cordis 事件发 macOS/Windows 系统桌面通知（实现见 system-notify.ts），
 * 点击通知跳转浏览器对应会话（client 半区的 deep-link 读取 `?session=`）。
 *
 * 配置契约：host settings namespace `notify` 为权威源（client 设置卡片与
 * host 通知逻辑共享同一配置）：
 *   - notify: { enabled, approval, turn, sessionDone, error, sound, overlap, probeServices }
 *
 * 防重叠：`overlap: 'auto'`（默认）下探测其他通知源（官方/生态），命中即
 * 自动跳过自身通知；探测状态仅供 host 自动暂停判定，翻转边界发一次系统
 * 提示（不注册 service，client 设置卡片无探测状态 UI）。
 *
 * inject 为最小集：settings（注册 namespace + 读取通知开关）。
 */
import type { Context } from '@deepseek-ai/cordis';
/** 插件配置页的 settings namespace：注册后出现在「设置 → 插件 → 配置」分派列表。 */
export declare const NOTIFY_SETTINGS_NAMESPACE = "notify";
export declare const name = "dsh-notify";
export declare const inject: string[];
export declare function apply(ctx: Context, _config?: Record<string, never>): void;
//# sourceMappingURL=index.d.ts.map