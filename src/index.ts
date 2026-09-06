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
import type {} from '@deepseek-ai/dsh-agent';
import type {} from '@deepseek-ai/dsh-user-approval';
import z from '@deepseek-ai/schemastery';
import { applySystemNotify, systemNotify, type NotifyConfig } from './system-notify.ts';
import type { ProbeState } from './notify-policy.ts';

/** 插件配置页的 settings namespace：注册后出现在「设置 → 插件 → 配置」分派列表。 */
export const NOTIFY_SETTINGS_NAMESPACE = 'notify'

/** Host context slice this plugin consumes. */
type NotifyHostContext = Context & {
  settings: {
    register<T>(ns: unknown, schema: unknown, options?: { base?: unknown; validate?: unknown }): { get(): T };
  };
}

export const name = 'dsh-notify'

export const inject = [
  'settings',
]

export function apply(ctx: NotifyHostContext, _config: Record<string, never> = {}): void {
  // 插件配置 namespace：client 设置卡片与 host 通知逻辑共享同一份配置。
  const notifyScope = ctx.settings.register(NOTIFY_SETTINGS_NAMESPACE, z.object({
    enabled: z.boolean().default(true),
    approval: z.boolean().default(true),
    turn: z.boolean().default(true),
    sessionDone: z.boolean().default(true),
    error: z.boolean().default(true),
    sound: z.boolean().default(true),
    overlap: z.union([z.const('auto'), z.const('mine')]).default('auto'),
    probeServices: z.array(z.string()).default([]),
  }))

  // 系统级桌面通知：监听 Cordis 事件，读 settings 配置判断开关。
  const notifyConfig = (): NotifyConfig => {
    const value = notifyScope.get() as unknown as {
      enabled?: boolean; approval?: boolean; turn?: boolean; sessionDone?: boolean;
      error?: boolean; sound?: boolean; overlap?: 'auto' | 'mine'; probeServices?: string[]
    }
    return {
      enabled: value.enabled ?? true,
      approval: value.approval ?? true,
      turn: value.turn ?? true,
      sessionDone: value.sessionDone ?? true,
      error: value.error ?? true,
      sound: value.sound ?? true,
      overlap: value.overlap ?? 'auto',
      probeServices: value.probeServices ?? [],
    }
  }
  // 暂停/恢复提示：仅在探测状态翻转时发一次（首次探测不发）。
  let prevProbe: ProbeState | undefined
  const onProbeChange = (state: ProbeState): void => {
    if (prevProbe !== undefined && prevProbe.official !== state.official) {
      if (state.official) {
        systemNotify('dsh-notify 已自动暂停', `检测到其他通知源（${state.source ?? '未知'}），已暂停自身通知；可在设置中改为「始终用本插件」恢复。`, undefined, false)
      } else {
        systemNotify('dsh-notify 已恢复', '其他通知源已消失，桌面通知恢复由本插件接管。', undefined, false)
      }
    }
    prevProbe = state
  }
  // 深链基址：惰性读 webServer 实际监听端口（官方 dsh-web-app 同款读取），每次通知
  // 都重新解析——apply 早于 webServer 就绪、或用 --port 起非默认端口时，
  // 一次性快照会永久停在回落值、点击跳转静默失效。
  const baseUrlOf = (): string => {
    const webServer = ctx.get('webServer') as { port?: unknown } | undefined
    const port = typeof webServer?.port === 'number' && webServer.port > 0 ? webServer.port : 3080
    return `http://127.0.0.1:${port}`
  }
  // probeServices 并入 notifyConfig() 每次读取（不再 apply 时快照）：改
  // settings 即时生效，无需重启（见 notifyConfig 与 system-notify 的
  // configOf().probeServices）。
  applySystemNotify(ctx, notifyConfig, baseUrlOf, onProbeChange)
}