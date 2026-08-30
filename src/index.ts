/**
 * dsh-notify — host half（组合器）。
 *
 * 监听 Cordis 事件发 macOS/Windows 系统桌面通知（实现见 system-notify.ts），
 * 点击通知跳转浏览器对应会话（client 半区的 deep-link 读取 `?session=`）。
 *
 * 配置契约：host settings namespace `notify` 为权威源（client 设置卡片与
 * host 通知逻辑共享同一配置）：
 *   - notify: { enabled, approval, turn, sessionDone, error, sound }
 *
 * inject 为最小集：settings（注册 namespace + 读取通知开关）。
 */
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-agent';
import type {} from '@deepseek-ai/dsh-user-approval';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings';
import z from '@deepseek-ai/schemastery';
import { applySystemNotify, type NotifyConfig } from './system-notify.ts';

/** 插件配置页的 settings namespace：注册后出现在「设置 → 插件 → 配置」分派列表。 */
export const NOTIFY_SETTINGS_NAMESPACE: SettingsNamespace = settingsNamespace('notify')

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
  }))

  // 系统级桌面通知：监听 Cordis 事件，读 settings 配置判断开关。
  const notifyConfig = (): NotifyConfig => {
    const value = notifyScope.get() as unknown as { enabled?: boolean; approval?: boolean; turn?: boolean; sessionDone?: boolean; error?: boolean }
    return {
      enabled: value.enabled ?? true,
      approval: value.approval ?? true,
      turn: value.turn ?? true,
      sessionDone: value.sessionDone ?? true,
      error: value.error ?? true,
    }
  }
  // 深链基址：从 webServer 服务推导实际监听端口（官方 dsh-web-app 同款读取），
  // 非 3080 部署的点击跳转不再失效；读不到回落默认值。
  const webServer = ctx.get('webServer') as { port?: unknown } | undefined
  const port = typeof webServer?.port === 'number' && webServer.port > 0 ? webServer.port : 3080
  applySystemNotify(ctx, notifyConfig, `http://127.0.0.1:${port}`)
}