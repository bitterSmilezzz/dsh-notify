/**
 * dsh-notify — host 侧事件监听与通知编排。
 *
 * 监听 Cordis 事件（轮次完成 / 审批请求 / Agent 出错 / 会话完成），按
 * settings 开关与聚焦状态决定是否发系统通知，并组装通知文案与深链 URL。
 * 平台通道实现见 system-notify.ts，文案见 notify-text.ts，聚焦状态见 presence.ts。
 *
 * 文案本地化：跟随官方 locale 插件的 settings 偏好（设置 → 通用 → 语言），
 * 读不到回落中文（见 notify-text.ts）。正文身份优先会话标题（官方
 * sessionTitle 服务），回落模型名——多会话并行时用户要能分辨是哪一个。
 *
 * 聚焦抑制分级（页面可见且上报新鲜时）：
 *   - 轮次完成 / 会话完成：抑制——非阻塞事件，用户正看着界面时弹通知是纯噪音；
 *   - 审批请求 / 出错：不抑制——审批是阻塞性的（用户不点就卡住），且官方审批
 *     UI 只出现在对应会话内，用户在看别的会话时看不到；错误同理（要知道出事了）。
 *
 * 通知是增益不是依赖：所有失败静默，绝不拖垮宿主进程。
 */
import type { Context } from '@deepseek-ai/cordis';
/** 通知开关（与 settings schema 的 notify 子对象一致）。 */
export interface NotifyConfig {
    enabled: boolean;
    approval: boolean;
    turn: boolean;
    sessionDone: boolean;
    error: boolean;
    /** 提示音：true=显式 Glass（macOS）/系统默认音（Windows）；false=跟随系统默认（macOS）/真静音（Windows）。Linux 忽略。 */
    sound: boolean;
}
/**
 * 安装系统通知：注册事件监听，读 settings 配置判断总开关与各事件开关，
 * 并接收浏览器半区的聚焦上报（页面可见时抑制非阻塞事件的通知）。
 *
 * @param ctx - host context（含 settings 服务的 `notify` scope）。
 * @param configOf - 读取当前通知配置（由组合器注入，scope.get() 快照）。
 * @param baseUrl - 浏览器地址（默认 3080；函数形式每次重新解析端口）。
 */
export declare function applySystemNotify(ctx: Context, configOf: () => NotifyConfig, baseUrl?: string | (() => string)): void;
//# sourceMappingURL=notify-events.d.ts.map