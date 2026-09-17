/**
 * dsh-notify — locale dictionaries (namespace `notify`).
 * Simplified Chinese is the key-set source of truth; the English dictionary is
 * checked complete against it (test/config-parity.test.mjs 钉住 key 集一致).
 * Product copy is Chinese-first per repo style.
 */

export const zh = {
  masterTitle: '桌面通知',
  masterDesc: '审批/轮次完成/会话完成/出错时弹系统通知，点击跳转对应会话（macOS 可点击需 terminal-notifier；Linux 仅展示）',
  groupNotify: '桌面通知',
  notifyTitle: '桌面通知',
  notifyDesc: 'Agent 轮次/审批/错误时弹系统通知',
  notifyApproval: '需要审批时提醒',
  notifyTurn: '轮次完成时提醒',
  notifySessionDone: '后台会话完成时提醒',
  notifyError: '出错时提醒',
  notifySound: '通知声音',
  notifySoundDesc: '开=播放提示音；关=静音（macOS 无法真静音，回落为系统默认音；Linux 由系统控制）',
  notifyTest: '试听',
  notifyPermTitle: '通知权限',
  notifyPermDesc: '若收不到系统通知，请在系统设置中允许「终端」/宿主 App 的通知',
  notifyPermOpen: '去系统设置开启',
  notifySaveFailed: '通知设置保存失败——可能不会在重启后保留，请重试',
  expand: '展开设置',
  collapse: '收起设置',
}
export const en = {
  masterTitle: 'Desktop notifications',
  masterDesc: 'System notifications on approvals / turn & session finish / errors; clicking jumps to the session (clickable on macOS only with terminal-notifier; display-only on Linux)',
  groupNotify: 'Desktop notifications',
  notifyTitle: 'Desktop notifications',
  notifyDesc: 'Show system notifications on agent turns, approvals, and errors',
  notifyApproval: 'Remind on approval requests',
  notifyTurn: 'Remind on turn finish',
  notifySessionDone: 'Remind on background session finish',
  notifyError: 'Remind on errors',
  notifySound: 'Notification sound',
  notifySoundDesc: 'On = play a sound; Off = silent (macOS cannot truly silence, falls back to the system default sound; Linux is controlled by the system)',
  notifyTest: 'Preview',
  notifyPermTitle: 'Notification permission',
  notifyPermDesc: 'If notifications don\'t appear, allow notifications for the Terminal / host app in System Settings',
  notifyPermOpen: 'Open System Settings',
  notifySaveFailed: 'Failed to save notification settings — they may not persist after restart. Please retry.',
  expand: 'Show settings',
  collapse: 'Hide settings',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-notify copy (flat keys). */
    'notify': string
  }
}
