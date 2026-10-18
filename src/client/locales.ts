/**
 * dsh-notify — locale dictionaries (namespace `notify`).
 * Simplified Chinese is the key-set source of truth; the English dictionary is
 * checked complete against it (test/config-parity.test.mjs 钉住 key 集一致).
 * Product copy is Chinese-first per repo style.
 *
 * 键分三类：设置卡文案（`notify*` / `group*` / `perm*`）、通知标题
 * （`title*`）、通知正文（`body*`）。
 */
// Type-only: 本模块末尾的 `declare module` 增补必须挂在 slots 包的类型图上。
import type {} from '@deepseek-ai/dsh-client-ui-slots'

export const zh = {
  masterTitle: '桌面通知',
  masterDesc: '审批/提问/轮次完成/会话完成/出错时弹系统通知，点击通知回到对应会话',

  groupEvents: '提醒事件',
  groupGeneral: '通用',
  groupQuiet: '免打扰',

  notifyTitle: '启用桌面通知',
  notifyDesc: '总开关；关闭后不再弹任何通知，分项设置保留',
  notifyApproval: '需要审批时提醒',
  notifyQuestion: '需要你回答时提醒',
  notifyTurn: '轮次完成时提醒',
  notifySessionDone: '会话结束时提醒',
  notifyError: '出错时提醒',
  notifySubagent: '子代理完成时提醒',
  notifySubagentDesc: '默认关闭——团队/子代理任务通常不需要逐条打扰',

  notifySummary: '通知正文显示详情',
  notifySummaryDesc: '关闭后正文只显示会话名，不把工作内容带到横幅上',

  notifySound: '通知声音',
  notifySoundDesc: '关闭后通知静音送达',
  notifyTest: '发一条测试通知',

  notifyQuiet: '开启免打扰时段',
  notifyQuietDesc: '该时段内不弹「轮次完成/会话完成/子代理」提醒；审批、提问与出错不受影响',
  notifyQuietStart: '开始',
  notifyQuietEnd: '结束',
  notifyQuietHint: '支持跨午夜，例如 22:00 → 08:00',

  permTitle: '通知权限',
  permDesc: '桌面 App 默认已允许；浏览器首次需要你点一下授权',
  permGrant: '开启通知',
  permGranted: '已授权',
  permDenied: '已被拒绝——请在浏览器/系统的站点设置里允许通知',
  permUnsupported: '当前运行时不支持系统通知',

  notifySaveFailed: '通知设置保存失败——可能不会在重启后保留，请重试',
  expand: '展开设置',
  collapse: '收起设置',

  titleApproval: '需要审批',
  titleQuestion: '需要你的回答',
  titleTurn: '轮次完成',
  titleSessionDone: '会话已结束',
  titleError: 'Agent 出错',
  titleSubagent: '子代理完成',

  bodyTurn: '已完成',
  bodySessionDone: '已结束',
  bodyUnknownError: '未知错误',
  approvalToolFallback: '某个工具',
  questionPlanReview: '待审阅计划',
}
export const en = {
  masterTitle: 'Desktop notifications',
  masterDesc: 'System notifications on approvals, questions, turn and session finish, and errors; clicking returns to that session',

  groupEvents: 'Events',
  groupGeneral: 'General',
  groupQuiet: 'Quiet hours',

  notifyTitle: 'Enable desktop notifications',
  notifyDesc: 'Master switch; turning it off stops every notification while keeping the per-event settings',
  notifyApproval: 'Notify on approval requests',
  notifyQuestion: 'Notify when your answer is needed',
  notifyTurn: 'Notify when a turn finishes',
  notifySessionDone: 'Notify when a session ends',
  notifyError: 'Notify on errors',
  notifySubagent: 'Notify when a subagent finishes',
  notifySubagentDesc: 'Off by default — team/subagent runs usually need no per-item interruption',

  notifySummary: 'Show details in the body',
  notifySummaryDesc: 'When off, the body shows only the session name instead of work content',

  notifySound: 'Notification sound',
  notifySoundDesc: 'When off, notifications are delivered silently',
  notifyTest: 'Send a test notification',

  notifyQuiet: 'Enable quiet hours',
  notifyQuietDesc: 'No turn-end, session-end, or subagent alerts during this window; approvals, questions, and errors still arrive',
  notifyQuietStart: 'From',
  notifyQuietEnd: 'To',
  notifyQuietHint: 'Crosses midnight, e.g. 22:00 → 08:00',

  permTitle: 'Notification permission',
  permDesc: 'The desktop app already allows notifications; a browser asks once',
  permGrant: 'Enable notifications',
  permGranted: 'Granted',
  permDenied: 'Denied — allow notifications for this site in the browser or system settings',
  permUnsupported: 'This runtime does not support system notifications',

  notifySaveFailed: 'Failed to save notification settings — they may not persist after restart. Please retry.',
  expand: 'Show settings',
  collapse: 'Hide settings',

  titleApproval: 'Approval needed',
  titleQuestion: 'Your answer is needed',
  titleTurn: 'Turn finished',
  titleSessionDone: 'Session ended',
  titleError: 'Agent error',
  titleSubagent: 'Subagent finished',

  bodyTurn: 'Finished',
  bodySessionDone: 'Ended',
  bodyUnknownError: 'Unknown error',
  approvalToolFallback: 'a tool',
  questionPlanReview: 'Plan awaiting review',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-notify copy (flat keys). */
    'notify': string
  }
}
