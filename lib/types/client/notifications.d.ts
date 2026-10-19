/**
 * dsh-notify — client-side notification controller.
 *
 * 通道：渲染进程的 Web `Notification` API。
 *   - 桌面 App（Electron）：就是系统原生通知，发送方身份是 App 本身；DSH 壳对
 *     非 media 权限一律放行（`apps/desktop/src/microphone-permissions.ts`），
 *     因此 `Notification.permission` 恒为 `granted`，没有授权流程；
 *   - 浏览器：走浏览器通知，首次需要一次用户手势（设置卡的「开启通知」）。
 *
 * 事件源全部是**官方 client 缝**，不依赖 host 侧自建事件或 HTTP 上报：
 *   - `ctx.uiSession.sessionStatus`：每个会话的 `running` / `pendingInteraction`
 *     / `completionUnread`。`completionUnread` 由官方运行时在「会话结束但主视图
 *     不在该会话」时置位，正是「后台会话跑完了」的权威判据；
 *   - `ctx.remote.$on('api-session/error')`：会话级错误；
 *   - `ctx.sessions.list`：标题、`origin === 'subagent'` 与「会话被移除」。
 *
 * 投递失败一律静默（通知是增益不是依赖），但**订阅回调里的异常绝不冒泡**：
 * 这些回调挂在官方事件总线上，抛错会污染主视图与其它插件。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { NotifyConfig } from './config.ts';
import type { LocaleT } from './locale.ts';
import type { OpenSession } from './navigation.ts';
/** 通知文案与配置的读取面（由组合器注入）。 */
export interface NotifyRuntime {
    /** 当前配置快照。 */
    config: () => NotifyConfig;
    /** locale 绑定的翻译函数。 */
    t: LocaleT;
    /** 当前语言 id（`zh` / `en`），用于 displayReason 取词。 */
    activeLocale: () => string;
}
/** 通知权限状态（`unsupported` 表示该运行时不提供 Notification）。 */
export declare function notificationPermission(): NotificationPermission | 'unsupported';
/**
 * 申请通知权限。**必须在用户手势里调用**（浏览器会静默拒绝无手势的请求）；
 * 桌面 App 恒为已授权，此调用直接返回 granted。
 * @returns 申请后的权限状态。
 */
export declare function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'>;
/**
 * 发一条测试通知（设置卡按钮用；同时消化掉浏览器对 requestPermission 的
 * 用户手势要求）。
 * @param title - 通知标题。
 * @param body - 通知正文。
 * @param sound - 是否发声。
 * @returns 实际投递成功时为 true。
 */
export declare function sendTestNotification(title: string, body: string, sound: boolean): boolean;
/**
 * 安装通知控制器：订阅官方 client 事件并按策略投递系统通知。
 *
 * @param ctx - client root context。
 * @param runtime - 配置与文案读取面。
 * @param openSession - 打开会话（点击通知时的导航入口，见 navigation.ts）。
 */
export declare function applyNotifications(ctx: ClientContext, runtime: NotifyRuntime, openSession: OpenSession): void;
//# sourceMappingURL=notifications.d.ts.map