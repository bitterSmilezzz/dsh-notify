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
/** 中文文案（key 集真相源，英文对照补全）。 */
export const ZH_NOTIFY_TEXT = {
    turnTitle: '轮次完成',
    turnBody: '该会话已结束一轮，可以切回查看',
    turnBodyNamed: (name) => `「${name}」已回复，可以切回查看`,
    approvalTitle: '需要审批',
    approvalToolFallback: '待审批操作',
    errorTitle: 'Agent 出错',
    errorUnknown: '未知错误',
    sessionDoneTitle: '会话完成',
    sessionDoneBody: '该会话已完成，可以切回查看',
    sessionDoneBodyNamed: (name) => `「${name}」已完成，可以切回查看`,
};
/** 英文文案。 */
export const EN_NOTIFY_TEXT = {
    turnTitle: 'Turn finished',
    turnBody: 'A turn finished — switch back to see the result',
    turnBodyNamed: (name) => `"${name}" replied — switch back to see the result`,
    approvalTitle: 'Approval needed',
    approvalToolFallback: 'an action',
    errorTitle: 'Agent error',
    errorUnknown: 'unknown error',
    sessionDoneTitle: 'Session finished',
    sessionDoneBody: 'The session finished — switch back to see the result',
    sessionDoneBodyNamed: (name) => `"${name}" finished — switch back to see the result`,
};
/** 全部字典（按 locale id 索引）。 */
export const NOTIFY_TEXTS = {
    zh: ZH_NOTIFY_TEXT,
    en: EN_NOTIFY_TEXT,
};
/**
 * 语言偏好 → 文案字典。BCP 47 风格偏好按主语言子标签匹配（`en-US` → en），
 * 未知/缺失/畸形一律回落中文，绝不抛错。
 * @param preference - locale settings 的 preference 字段（可能缺失或畸形）。
 */
export function notifyTextOf(preference) {
    if (typeof preference !== 'string')
        return ZH_NOTIFY_TEXT;
    const primary = preference.trim().toLowerCase().split(/[-_]/u, 1)[0];
    return primary === 'en' ? EN_NOTIFY_TEXT : ZH_NOTIFY_TEXT;
}
//# sourceMappingURL=notify-text.js.map