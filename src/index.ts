/**
 * dsh-notify — host half（组合器）。
 *
 * 监听 Cordis 事件发系统桌面通知（平台通道见 system-notify.ts，事件编排见
 * notify-events.ts），点击通知跳转浏览器对应会话（client 半区的 deep-link
 * 读取 `#session=`）。
 *
 * 配置契约：host Config namespace `notify` 为权威源（client 设置卡片与 host
 * 通知逻辑共享同一配置）：
 *   - notify: { enabled, approval, turn, sessionDone, error, sound }
 *
 * DSH 0.1.7 起 settings 走 profile-backed forms 架构：插件在入口模块顶层
 * 导出 `Config`（schemastery 对象）+ `apply(ctx, config)` 函数插件，
 * namespace 由 entry id（`cordis.patch.yml` 的 `id`）提供，Cordis 把校验后的
 * 配置直接注入 apply 第二参。字段全部标 `.volatile()`——没有 volatile 标记的
 * entry 不会进入 `describe()`，官方配置页与 client 写入会静默失效。
 *
 * 聚焦感知：client 半区经官方 Connection RPC 通道上报页面可见性，可见时
 * 抑制「轮次完成 / 会话完成」这类非阻塞通知（见 notify-events.ts 分级说明）。
 *
 * connection / sessionTitle / webServer 都是可选能力，一律 `ctx.get` /
 * scoped inject 读取，缺失时优雅降级（通知是增益不是依赖）。
 */
import type { Volatile } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-user-approval'
import z from '@deepseek-ai/schemastery';
import { applySystemNotify, type NotifyConfig } from './notify-events.ts'

/** 插件配置页的 settings namespace：与 entry id（cordis.patch.yml 的 `id`）一致。 */
export const NOTIFY_SETTINGS_NAMESPACE = 'notify'

export const name = 'dsh-notify'

/** Host plugin configuration：通知总开关与各事件分项开关。 */
export interface Config {
  enabled: Volatile<boolean>
  approval: Volatile<boolean>
  turn: Volatile<boolean>
  sessionDone: Volatile<boolean>
  error: Volatile<boolean>
  sound: Volatile<boolean>
}

/**
 * 顶层 Config：全部字段 volatile，桌面通知的所有开关都支持不重启热改。
 * 默认全开（`enabled` 为总开关，取消勾选后保留分项值）。
 *
 * volatile 字段在运行时是 `Volatile<T>` 引用（官方 `plainOptions()` 同款语义：
 * 每次读 `.get()` 拿当前值，热改后无需重挂插件），所以接口字段标 Volatile。
 * 注意按官方范式（llm-deepseek）不加 `z<Config>` 泛型标注：volatile 会让
 * ObjectS 的形状与接口产生逆变冲突，官方 volatile Config 一律省略泛型。
 */
export const Config = z.object({
  enabled: z.boolean().default(true).volatile(),
  approval: z.boolean().default(true).volatile(),
  turn: z.boolean().default(true).volatile(),
  sessionDone: z.boolean().default(true).volatile(),
  error: z.boolean().default(true).volatile(),
  sound: z.boolean().default(true).volatile(),
})

export function apply(ctx: Context, config: Config): void {
  // 系统级桌面通知：监听 Cordis 事件，读 config 判断开关。
  // volatile 字段每次显式解引用，所以热改后同一份闭包拿到的是最新值。
  const notifyConfig = (): NotifyConfig => ({
    enabled: config.enabled.get(),
    approval: config.approval.get(),
    turn: config.turn.get(),
    sessionDone: config.sessionDone.get(),
    error: config.error.get(),
    sound: config.sound.get(),
  })
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
