/**
 * dsh-notify — browser half entry (single fiber).
 *
 * 组合：设置卡片（settings.plugin.item, key: notify）、通知声音、点通知跳会话
 * deep-link。配置由 host settings 服务持有（config.ts）。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the settings slot merges (settings.general.item / settings.plugins.tab).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the ui-settings-plugins SlotMap merge (the settings.plugin.item card seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { zh, en } from './locales.ts'
import { CSS } from './styles.ts'
import { bindConfigScope } from './config.ts'
import { NotifySettingsCard } from './settings-card.tsx'
import { applySessionDeepLink } from './deep-link.ts'
import { mountSoundWarmup } from './sound.ts'

export { zh, en }

const NS = 'notify'

export const inject = [
  'slots',
  'locale',
  'sessions',
  'settingsScope',
]

export function apply(ctx: ClientContext): void {
  // 配置权威源是 host settings 服务。
  ctx.effect(() => bindConfigScope(ctx), 'dsh-notify: settings scope sync')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-notify: dictionaries')
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-notify'
    tag.dataset.pluginCss = 'dsh-notify'
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'dsh-notify: styles')
  // 音效预热监听 + AudioContext 生命周期随 fiber 挂载/回收（防 update/HMR 泄漏）。
  ctx.effect(() => mountSoundWarmup(), 'dsh-notify: sound warmup')
  const t = ctx.locale.bind(NS)

  // 插件配置卡片（settings.plugin.item）
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: NS,
    locale: NS,
  }, () => jsxRuntime.jsx(NotifySettingsCard, { t })))

  // 点系统通知跳转对应会话（host 通知的 client 半区）
  applySessionDeepLink(ctx)
}

export const name = 'dsh-notify'