/**
 * dsh-notify — host 侧通知文案（本地化）。
 *
 * 系统通知是给用户读的，语言必须跟随用户偏好，而不是硬编码中文。偏好来源
 * 是官方 locale 插件的 settings namespace `locale`（字段 `preference`，
 * 设置 → 通用 → 语言写入的那一份）：host 半区读它，读不到回落中文
 * （本仓库中文优先，且 locale 未设置时 DSH 浏览器侧按浏览器语言自行回落，
 * host 无从得知）。
 *
 * 字典是纯数据 + 纯函数（无 I/O、无 ctx），node --test 可直接覆盖：
 * zh/en 的 key 集必须一致（notify-text 测试钉住），取词函数对任意输入
 * 都不抛错（通知是增益不是依赖）。
 */
/** 支持的通知语言（其余偏好一律回落中文）。 */
export type NotifyLocale = 'zh' | 'en';
/** 一份语言的通知文案。函数型条目承载"带会话身份"的正文变体。 */
export interface NotifyText {
    /** 轮次完成通知标题。 */
    readonly turnTitle: string;
    /** 轮次完成正文（无会话身份可读时）。 */
    readonly turnBody: string;
    /** 轮次完成正文（带会话身份：会话标题或模型名）。 */
    readonly turnBodyNamed: (name: string) => string;
    /** 审批请求通知标题。 */
    readonly approvalTitle: string;
    /** 审批请求的 toolName 缺失时的兜底文案。 */
    readonly approvalToolFallback: string;
    /** Agent 出错通知标题。 */
    readonly errorTitle: string;
    /** 错误对象取不出 message/name 时的兜底文案。 */
    readonly errorUnknown: string;
    /** 会话完成通知标题。 */
    readonly sessionDoneTitle: string;
    /** 会话完成正文（无会话身份可读时）。 */
    readonly sessionDoneBody: string;
    /** 会话完成正文（带会话身份：会话标题或模型名）。 */
    readonly sessionDoneBodyNamed: (name: string) => string;
}
/** 中文文案（key 集真相源，英文对照补全）。 */
export declare const ZH_NOTIFY_TEXT: NotifyText;
/** 英文文案。 */
export declare const EN_NOTIFY_TEXT: NotifyText;
/** 全部字典（按 locale id 索引）。 */
export declare const NOTIFY_TEXTS: Record<NotifyLocale, NotifyText>;
/**
 * 语言偏好 → 文案字典。BCP 47 风格偏好按主语言子标签匹配（`en-US` → en），
 * 未知/缺失/畸形一律回落中文，绝不抛错。
 * @param preference - locale settings 的 preference 字段（可能缺失或畸形）。
 */
export declare function notifyTextOf(preference: unknown): NotifyText;
//# sourceMappingURL=notify-text.d.ts.map