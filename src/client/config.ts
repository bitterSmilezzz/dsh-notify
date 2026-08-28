/**
 * dsh-notify — client configuration model.
 *
 * 配置权威源是 host settings 服务（namespace `notify`）。本模块持有运行时
 * 快照 `config`（控制器同步读取），提供 host scope 的绑定与写入。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the settings domain's Context merge (ctx.settingsScope).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

/** 统一配置对象：与 host settings schema 结构一致。 */
export interface NotifyConfig {
  enabled: boolean
  approval: boolean
  turn: boolean
  sessionDone: boolean
  error: boolean
  sound: boolean
}

/** 配置默认值（与 host schema 的 default 一致）。 */
export const DEFAULTS: NotifyConfig = {
  enabled: true,
  approval: true,
  turn: true,
  sessionDone: true,
  error: true,
  sound: true,
}

/** 运行时配置快照：初始为默认值，scope 订阅与 setConfig 共同维护。 */
export const config: NotifyConfig = { ...DEFAULTS }

/** host settings scope 的写路径（apply 时绑定；未绑定则只更新本地快照）。 */
let notifyScope: { set(field: string, value: unknown): Promise<void> } | undefined

/** 广播配置变更（控制器/设置卡片监听，驱动重渲染与动态注册）。 */
function announce(): void {
  // detail 传浅拷贝：消费方绝不拿到全局真相的可变引用。
  window.dispatchEvent(new CustomEvent('dsh-notify:config', { detail: { ...config } }))
}

/**
 * 绑定 host settings scope 并订阅：首次读取当前值，之后 scope 变化回写
 * 本地快照并广播。
 * @param ctx - client root context。
 * @returns 订阅 disposer（随 fiber 清理）。
 */
export function bindConfigScope(ctx: ClientContext): () => void {
  const scope = ctx.settingsScope.bind<NotifyConfig>({ namespace: 'notify' })
  notifyScope = scope
  const applySnapshot = (): void => {
    const value = scope.getSnapshot().value
    if (value !== undefined && typeof value === 'object') {
      for (const key of Object.keys(DEFAULTS) as (keyof NotifyConfig)[]) {
        const next = value[key]
        if (typeof next === 'boolean') config[key] = next
      }
      announce()
    }
  }
  // 订阅在宿主写回时同步快照。
  const unsub = scope.subscribe(applySnapshot)
  // 首次立即应用 host 当前值（覆盖默认值——host 是权威源）。
  applySnapshot()
  return unsub
}

/**
 * 更新一个配置字段：改本地快照 → 广播 → 写 host settings。
 * @param field - 配置字段名。
 * @param mutator - 修改快照的闭包（同步执行后读取新值写 host）。
 */
export function setConfig(field: keyof NotifyConfig, mutator: () => void): void {
  mutator()
  announce()
  if (notifyScope !== undefined) {
    void notifyScope.set(field, config[field]).catch(() => {
      // 写失败：广播错误事件，设置卡片可感知并提示。
      window.dispatchEvent(new CustomEvent('dsh-notify:config-error', { detail: { field } }))
    })
  }
}