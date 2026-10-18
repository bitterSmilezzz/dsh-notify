/**
 * dsh-notify — browser half entry (single fiber).
 *
 * 组合：通知控制器（Web Notification 通道，见 notifications.ts）、设置卡片、
 * 通知声音试听、URL deep-link。配置由 host Config 持有（config.ts）。
 *
 * 设置卡片注册到官方 `plugins.bundle.config` 契约（插件详情页）。旧契约
 * `settings.plugin.item` 已在 dsh 0.1.6-alpha.2 退役（commit 90af3110b7），
 * 不再注册（见 settings-card.tsx）。用 `slots.inject` 注册——未声明该 slot
 * 的部署里 inject 只是等待，不会报错。
 *
 * activation safety：所有服务在 apply 顶层一次性取出。回调里再走
 * `ctx.<service>` 会撞上「inactive context」并被桌面壳视为致命启动失败。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the ui-renderer Context merge (ctx.slots), moved here in dsh-settings alpha.2.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the settings slot merges (settings.general.item / settings.plugins.tab).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the plugin-manager SlotMap merge (the plugins.bundle.config seat).
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { zh, en } from './locales.ts'
import { CSS } from './styles.ts'
import { bindConfigScope, config } from './config.ts'
import { applyNotifications, type NotifyRuntime } from './notifications.ts'
import { NotifySettingsCard, type NotifyCardView } from './settings-card.tsx'
import { applySessionDeepLink } from './deep-link.ts'

export { zh, en }

/** 设置 namespace（host settings 的 entry id）。 */
const NS = 'notify'

/** 包名（`plugins.bundle.config` 的 key：bundle 的 package name）。 */
const PACKAGE_NAME = '@bittersmilezzz/dsh-notify'

/** 卡片 occupant 的 owner props（view 由插件详情页传入）。 */
interface NotifyCardOwnerProps {
  view?: NotifyCardView | undefined
}

export const inject = [
  'slots',
  'locale',
  'configForms',
]

export function apply(ctx: ClientContext): void {
  // 配置权威源是 host Config（DSH 0.1.7 profile-backed forms）。
  ctx.effect(() => bindConfigScope(ctx), 'dsh-notify: config form sync')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-notify: dictionaries')
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = '@bittersmilezzz/dsh-notify'
    tag.dataset.pluginCss = '@bittersmilezzz/dsh-notify/client'
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'dsh-notify: styles')

  // locale 服务在 apply 顶层捕获：回调里再读 ctx.locale 会撞 inactive context。
  const locale = ctx.locale
  const runtime: NotifyRuntime = {
    // 每次显式读全局快照，热改配置后无需重挂控制器。
    config: () => ({ ...config }),
    t: ctx.locale.bind(NS),
    activeLocale: () => locale.getLocale().active,
  }
  applyNotifications(ctx, runtime)

  const t = ctx.locale.bind(NS)
  const card = (props: NotifyCardOwnerProps) => jsxRuntime.jsx(NotifySettingsCard, { t, view: props?.view })

  // 设置卡片（plugins.bundle.config，keyed by package name；
  // 渲染在插件详情页，owner 传 view: 'summary' | 'page'）
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config',
    key: PACKAGE_NAME,
    locale: NS,
  }, card))

  // URL deep-link：`#session=<id>` / `?session=<id>` 直达对应会话
  applySessionDeepLink(ctx)
}

export const name = 'dsh-notify'
