/**
 * dsh-notify — host half（组合器）。
 *
 * 监听 Cordis 事件发系统桌面通知（平台通道见 system-notify.ts，事件编排见
 * notify-events.ts），点击通知跳转浏览器对应会话（client 半区的 deep-link
 * 读取 `#session=`）。
 *
 * 配置契约：host settings namespace `notify` 为权威源（client 设置卡片与
 * host 通知逻辑共享同一配置）：
 *   - notify: { enabled, approval, turn, sessionDone, error, sound }
 *
 * 聚焦感知：client 半区经官方 Connection RPC 通道上报页面可见性，可见时
 * 抑制「轮次完成 / 会话完成」这类非阻塞通知（见 notify-events.ts 分级说明）。
 *
 * inject 为最小集：settings（注册 namespace + 读取通知开关）。connection /
 * sessionTitle / webServer 都是可选能力，一律 `ctx.get` / scoped inject 读取，
 * 缺失时优雅降级（通知是增益不是依赖）。
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-user-approval'
// Type-only: pulls the dsh-settings Context merge (ctx.settings) — 官方
// SettingsProvider 类型，register 返回 SettingsScope<T>，get() 直接给
// schema 推断类型，不再需要手写 NotifyHostContext。
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery';
import { applySystemNotify, type NotifyConfig } from './notify-events.ts'

/** 插件配置页的 settings namespace：注册后出现在「设置 → 插件 → 配置」分派列表。 */
export const NOTIFY_SETTINGS_NAMESPACE = 'notify'

export const name = 'dsh-notify'

export const inject = [
  'settings',
]

export function apply(ctx: Context, _config: Record<string, never> = {}): void {
  // 插件配置 namespace：client 设置卡片与 host 通知逻辑共享同一份配置。
  const notifyScope = ctx.settings.register(NOTIFY_SETTINGS_NAMESPACE, z.object({
    enabled: z.boolean().default(true),
    approval: z.boolean().default(true),
    turn: z.boolean().default(true),
    sessionDone: z.boolean().default(true),
    error: z.boolean().default(true),
    sound: z.boolean().default(true),
  }))

  // 系统级桌面通知：监听 Cordis 事件，读 settings 配置判断开关。
  // scope.get() 为 schema 推断类型（字段全部带 default，恒为完整形态）。
  const notifyConfig = (): NotifyConfig => {
    const value = notifyScope.get()
    return {
      enabled: value.enabled,
      approval: value.approval,
      turn: value.turn,
      sessionDone: value.sessionDone,
      error: value.error,
      sound: value.sound,
    }
  }
  // 深链基址：惰性读 webServer 实际监听端口（官方 dsh-web-app 同款读取），每次通知
  // 都重新解析——apply 早于 webServer 就绪、或用 --port 起非默认端口时，
  // 一次性快照会永久停在回落值、点击跳转静默失效。
  const baseUrlOf = (): string => {
    const webServer = ctx.get('webServer') as { port?: unknown } | undefined
    const port = typeof webServer?.port === 'number' && webServer.port > 0 ? webServer.port : 3080
    return `http://127.0.0.1:${port}`
  }
  applySystemNotify(ctx, notifyConfig, baseUrlOf)
}
