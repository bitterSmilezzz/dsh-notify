/**
 * dsh-notify — settings card (settings.plugin.item / plugins.bundle.config).
 *
 * 一张卡片同时服务两代官方契约（DSH 0.1.6 期间换过插件配置架构）：
 *   - 旧契约 `settings.plugin.item`（keyed by settings namespace）：渲染在
 *     「设置 → 插件 → 插件配置」列表里，occupant 自绘折叠外壳（无 view 属性）；
 *   - 新契约 `plugins.bundle.config`（keyed by package name）：渲染在插件详情页
 *     （侧边栏 Plugins 面板 → 本插件 → 配置表单），页面自己画标题/图标/面包屑，
 *     occupant 只按 `view: 'summary' | 'page'` 渲染一行摘要或表单。
 * 两个注册共用本组件；`view` 缺省即旧契约路径（见 client/index.ts）。
 *
 * 开关走 config 快照（host settings 为权威源），拨动即写 host（无暂存/保存步）：
 * 开关的意图是即时的，不存在官方 staged 文本字段那种「未预览的写入」问题。
 */
import * as react from 'react'
// Type-only: pulls the ui-settings-plugins SlotMap merge (the old settings.plugin.item seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
// Type-only: pulls the plugin-manager SlotMap merge (the plugins.bundle.config seat).
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { IconChevronDownOutline14, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { config, setConfig } from './config.ts'
import { playSound } from './sound.ts'
import type { LocaleT } from './locale.ts'

/** 官方契约的视图选择；旧契约（settings.plugin.item）不传。 */
export type NotifyCardView = 'summary' | 'page'

/** 一个开关行：官方 Switch（对齐官方设置面板控件），点击开关切换。 */
function ToggleRow({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="dshn-row">
      <span className="dshn-rowText">
        <span className="dshn-rowTitle">{title}</span>
        {desc ? <span className="dshn-rowDesc">{desc}</span> : null}
      </span>
      <span className="dshn-field">
        <Switch checked={checked} onChange={onChange} label={title} />
      </span>
    </div>
  )
}

/** 宿主是否为 macOS（用于「去系统设置开启」入口的可见性判断：
 *  x-apple.systempreferences 深链只在 macOS 有效，Windows/Linux 展示了也无用）。 */
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent)

/**
 * 通知设置表单主体：桌面通知开关分组 + 试听 + 权限入口。
 * @param props.t - locale 绑定的翻译函数。
 * @returns 表单内容（不含外壳，外壳由调用方按契约决定）。
 */
function NotifyForm({ t }: { t: LocaleT }) {
  const [saveFailed, setSaveFailed] = react.useState(false)
  const [, force] = react.useReducer((x) => x + 1, 0)

  // 外部改配置时同步重渲染；写 host 失败时提示。
  react.useEffect(() => {
    const onConfig = () => { force(); setSaveFailed(false) }
    const onError = () => setSaveFailed(true)
    window.addEventListener('dsh-notify:config', onConfig)
    window.addEventListener('dsh-notify:config-error', onError)
    return () => {
      window.removeEventListener('dsh-notify:config', onConfig)
      window.removeEventListener('dsh-notify:config-error', onError)
    }
  }, [])

  return (
    <div className="dshn-form">
      {saveFailed ? <p className="dshn-status dshn-err" role="alert">{t('notifySaveFailed')}</p> : null}
      <div className="dshn-group">
        <p className="dshn-groupTitle">{t('groupNotify')}</p>
        <ToggleRow
          title={t('notifyTitle')}
          desc={t('notifyDesc')}
          checked={config.enabled}
          onChange={() => setConfig('enabled', () => { config.enabled = !config.enabled })}
        />
        <ToggleRow
          title={t('notifyApproval')}
          checked={config.approval}
          onChange={() => setConfig('approval', () => { config.approval = !config.approval })}
        />
        <ToggleRow
          title={t('notifyTurn')}
          checked={config.turn}
          onChange={() => setConfig('turn', () => { config.turn = !config.turn })}
        />
        <ToggleRow
          title={t('notifySessionDone')}
          checked={config.sessionDone}
          onChange={() => setConfig('sessionDone', () => { config.sessionDone = !config.sessionDone })}
        />
        <ToggleRow
          title={t('notifyError')}
          checked={config.error}
          onChange={() => setConfig('error', () => { config.error = !config.error })}
        />
        <div className="dshn-row">
          <div className="dshn-rowText">
            <span className="dshn-rowTitle">{t('notifySound')}</span>
            <span className="dshn-rowDesc">{t('notifySoundDesc')}</span>
          </div>
          <div className="dshn-field">
            {/* 官方 Switch（自带开关角色、无障碍名与 aria-checked），与上方 ToggleRow 同源；
                「音效」行多一个试听按钮，故不套 ToggleRow，只复用同一个官方控件。 */}
            <Switch
              checked={config.sound}
              onChange={() => setConfig('sound', () => { config.sound = !config.sound })}
              label={t('notifySound')}
            />
            <button type="button" className="dshn-button" onClick={() => playSound(true)}>
              {t('notifyTest')}
            </button>
          </div>
        </div>
        {IS_MAC ? (
          <div className="dshn-row">
            <div className="dshn-rowText">
              <span className="dshn-rowTitle">{t('notifyPermTitle')}</span>
              <p className="dshn-rowDesc">{t('notifyPermDesc')}</p>
            </div>
            <div className="dshn-field">
              <button
                type="button"
                className="dshn-button"
                onClick={() => {
                  // macOS：打开系统设置通知页（需用户手动开启 Terminal/宿主 App 的通知）。
                  window.open('x-apple.systempreferences:com.apple.Notifications-Settings.extension', '_self')
                }}
              >
                {t('notifyPermOpen')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * 旧契约（settings.plugin.item）的折叠外壳：官方页面不画标题时由卡片自绘，
 * 视觉参数对齐官方 PluginCard（border-l4 / radius 16 / 打开态换背景与描边）。
 */
function LegacyCardShell({ t, children }: { t: LocaleT; children: react.ReactNode }) {
  const [open, setOpen] = react.useState(false)
  return (
    <li className={'dshn-card' + (open ? ' dshn-cardOpen' : '')}>
      <button
        type="button"
        className="dshn-header"
        aria-expanded={open}
        aria-label={`${t(open ? 'collapse' : 'expand')}: ${t('masterTitle')}`}
        onClick={() => setOpen(!open)}
      >
        <span className="dshn-headtext">
          <span className="dshn-name">{t('masterTitle')}</span>
          <span className="dshn-desc">{t('masterDesc')}</span>
        </span>
        <IconChevronDownOutline14 className={'dshn-chevron' + (open ? ' dshn-open' : '')} />
      </button>
      {open ? <div className="dshn-body">{children}</div> : null}
    </li>
  )
}

/**
 * 通知设置卡片主体。三种渲染路径：
 *   - `view: 'summary'`：插件详情页上的一行摘要；
 *   - `view: 'page'`：插件详情页里的配置表单（官方页面已画标题）；
 *   - 无 `view`：旧契约的折叠卡片（自绘外壳）。
 * @param props.t - locale 绑定（闭包传入）。
 * @param props.view - 官方新契约的视图选择（旧契约不传）。
 */
export function NotifySettingsCard({ t, view }: { t: LocaleT; view?: NotifyCardView | undefined }) {
  if (view === 'summary') return <>{t('masterDesc')}</>
  const form = <NotifyForm t={t} />
  if (view === 'page') return form
  return <LegacyCardShell t={t}>{form}</LegacyCardShell>
}
