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
  notifySoundDesc: '开=播提示音；关=静音（macOS 侧为系统默认音，无法真静音）',
  notifyTest: '试听',
  notifyPermTitle: '通知权限',
  notifyPermDesc: '若收不到系统通知，请在系统设置中允许「终端」/宿主 App 的通知',
  notifyPermOpen: '去系统设置开启',
  notifySaveFailed: '通知设置保存失败——可能不会在重启后保留，请重试',
  overlapTitle: '与其他通知源冲突时',
  overlapDesc: '官方或生态其他插件提供通知时：自动暂停本插件可避免重复弹窗；「始终用本插件」则忽略检测。自动暂停时会弹出系统提示',
  overlapAuto: '自动暂停（推荐）',
  overlapMine: '始终用本插件',
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
  notifySoundDesc: 'On = play a sound; Off = silent (macOS falls back to system default sound, cannot truly silence)',
  notifyTest: 'Preview',
  notifyPermTitle: 'Notification permission',
  notifyPermDesc: 'If notifications don\'t appear, allow notifications for the Terminal / host app in System Settings',
  notifyPermOpen: 'Open System Settings',
  notifySaveFailed: 'Failed to save notification settings — they may not persist after restart. Please retry.',
  overlapTitle: 'When another notifier exists',
  overlapDesc: 'When the official app or another plugin provides notifications: auto-pause this plugin to avoid duplicates, or always use this plugin. Auto-pause shows a system notice',
  overlapAuto: 'Auto-pause (recommended)',
  overlapMine: 'Always use this plugin',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-notify copy (flat keys). */
    'notify': string
  }
}