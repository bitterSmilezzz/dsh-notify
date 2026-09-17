/**
 * dsh-notify — browser half entry (single fiber).
 *
 * 组合：设置卡片、通知声音、点通知跳会话 deep-link、聚焦上报。
 * 配置由 host settings 服务持有（config.ts）。
 *
 * 设置卡片注册两代官方契约（DSH 0.1.6 期间换过插件配置架构，见
 * settings-card.tsx）：`settings.plugin.item`（旧：设置 → 插件 → 插件配置）
 * 与 `plugins.bundle.config`（新：插件详情页）。两个 slot 都用 `slots.inject`
 * 注册——未声明该 slot 的部署里 inject 只是等待，不会报错，因此双注册在
 * 新旧运行时下都安全。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the ui-renderer Context merge (ctx.slots), moved here in dsh-settings alpha.2.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the settings slot merges (settings.general.item / settings.plugins.tab).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the ui-settings-plugins SlotMap merge (the settings.plugin.item card seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
// Type-only: pulls the plugin-manager SlotMap merge (the plugins.bundle.config seat).
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { zh, en } from './locales.ts'
import { CSS } from './styles.ts'
import { bindConfigScope } from './config.ts'
import { NotifySettingsCard, type NotifyCardView } from './settings-card.tsx'
import { applySessionDeepLink } from './deep-link.ts'
import { mountSoundWarmup } from './sound.ts'
import { applyPresenceReporting } from './presence.ts'

export { zh, en }

/** 设置 namespace（host settings 的 `notify`，旧契约的 slot key 同此）。 */
const NS = 'notify'

/** 包名（新契约 `plugins.bundle.config` 的 key：bundle 的 package name）。 */
const PACKAGE_NAME = '@bittersmilezzz/dsh-notify'

/** 卡片 occupant 的 owner props（两代契约的并集：view 仅新契约提供）。 */
interface NotifyCardOwnerProps {
  view?: NotifyCardView | undefined
}

export const inject = [
  'slots',
  'locale',
  'settingsScope',
]

export function apply(ctx: ClientContext): void {
  // 配置权威源是 host settings 服务。
  ctx.effect(() => bindConfigScope(ctx), 'dsh-notify: settings scope sync')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-notify: dictionaries')
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = '@bittersmilezzz/dsh-notify'
    tag.dataset.pluginCss = '@bittersmilezzz/dsh-notify/client'
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'dsh-notify: styles')
  // 音效预热监听 + AudioContext 生命周期随 fiber 挂载/回收（防 update/HMR 泄漏）。
  ctx.effect(() => mountSoundWarmup(), 'dsh-notify: sound warmup')
  const t = ctx.locale.bind(NS)
  const card = (props: NotifyCardOwnerProps) => jsxRuntime.jsx(NotifySettingsCard, { t, view: props?.view })

  // 设置卡片（旧契约：settings.plugin.item，keyed by settings namespace）
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: NS,
    locale: NS,
  }, card))

  // 设置卡片（新契约：plugins.bundle.config，keyed by package name；
  // 渲染在插件详情页，owner 传 view: 'summary' | 'page'）
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config',
    key: PACKAGE_NAME,
    locale: NS,
  }, card))

  // 点系统通知跳转对应会话（host 通知的 client 半区）
  applySessionDeepLink(ctx)

  // 聚焦上报：页面可见性变化时告知 host（抑制非阻塞通知）
  applyPresenceReporting(ctx)
}

export const name = 'dsh-notify'
