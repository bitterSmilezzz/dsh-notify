/**
 * dsh-notify — 通知音效（Web Audio 合成）。
 *
 * 为什么不用系统提示音：Web Notification **无法指定音色**。`silent` 只能关掉
 * 系统声，具体响声由 macOS / Windows 的通知设置决定，插件改不了，也无法让
 * 「审批」与「轮次完成」听起来不一样。所以音效由本模块合成：
 *
 *   - 打开音效时通知带 `silent: true`，**只响自绘这一份**（不叠加系统声）；
 *   - 关闭音效时通知也带 `silent: true`——系统声一并关掉，开关语义才是
 *     「有没有声音」而不是「哪种声音」。
 *
 * 音色按事件分档（同一类事件复用一个 motif，靠音高与节奏区分轻重）：
 *   审批 / 提问 = 双音上行（需要你动手，最显眼）
 *   出错       = 下行小三度（故障，听感下沉）
 *   轮次完成   = 单音轻响（最高频，最克制）
 *   会话结束   = 双音下行（收束）
 *   子代理完成 = 与轮次完成同款，音量更低（默认关闭）
 *
 * AudioContext 懒创建：没有用户手势前浏览器会把它挂在 suspended，后台标签页
 * 尤其如此。因此挂 document 级预热监听，首次交互时 resume。
 */
import type { NoticeKind } from '../notify-policy.ts';
/**
 * 挂载音频预热：首次用户交互时创建/恢复 AudioContext。
 *
 * 必须由 fiber 持有 disposer——插件 update/HMR 时旧监听若不清会累积，
 * AudioContext 也会泄漏。
 * @returns disposer：移除监听并关闭 AudioContext。
 */
export declare function mountSoundWarmup(): () => void;
/**
 * 播放某类事件的音效（受声音开关与节流控制）。
 *
 * @param kind - 事件类别，决定音色。
 * @param enabled - 声音开关当前值。
 * @param now - 当前时间（毫秒）；注入以便测试节流。
 */
export declare function playNoticeSound(kind: NoticeKind, enabled: boolean, now?: number): void;
/**
 * 试听音效：无视声音开关，让用户在关闭开关后仍能确认音色。
 * @param kind - 要试听的事件音色。
 */
export declare function previewNoticeSound(kind: NoticeKind): void;
//# sourceMappingURL=sound.d.ts.map