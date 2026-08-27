/**
 * dsh-notify — locale dictionaries (namespace `notify`).
 * Simplified Chinese is the key-set source of truth; the English dictionary is
 * checked complete against it. Product copy is Chinese-first per repo style.
 */

export const zh = {
  masterTitle: '桌面通知',
  masterDesc: '审批/轮次完成/会话完成/出错时的系统级通知，点击可跳转会话',
  groupNotify: '桌面通知',
  notifyTitle: '桌面通知',
  notifyDesc: '你在其他标签页时弹出系统通知',
  notifyApproval: '需要审批时提醒',
  notifyTurn: '轮次完成时提醒',
  notifySessionDone: '后台会话完成时提醒',
  notifyError: '出错时提醒',
  notifySound: '通知声音',
  notifySoundDesc: '弹出通知时播放提示音，四类通知音效各不相同',
  notifyTest: '试听',
  notifyPermTitle: '通知权限',
  notifyPermDesc: '若收不到系统通知，请在系统设置中允许「终端」/宿主 App 的通知',
  notifyPermOpen: '去系统设置开启',
}
export const en = {
  masterTitle: 'Desktop notifications',
  masterDesc: 'System notifications for approvals / turn & session finish / errors, click to jump to the session',
  groupNotify: 'Desktop notifications',
  notifyTitle: 'Desktop notifications',
  notifyDesc: 'Show system notifications while you are on another tab',
  notifyApproval: 'Remind on approval requests',
  notifyTurn: 'Remind on turn finish',
  notifySessionDone: 'Remind on background session finish',
  notifyError: 'Remind on errors',
  notifySound: 'Notification sound',
  notifySoundDesc: 'Play a distinct sound for each notification type',
  notifyTest: 'Preview',
  notifyPermTitle: 'Notification permission',
  notifyPermDesc: 'If notifications don\'t appear, allow notifications for the Terminal / host app in System Settings',
  notifyPermOpen: 'Open System Settings',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-notify copy (flat keys). */
    'notify': string
  }
}