/**
 * dsh-notify — settings card (plugins.bundle.config).
 *
 * 渲染在插件详情页（侧边栏 Plugins 面板 → 本插件 → 配置表单）：页面自己画
 * 标题/图标/面包屑，occupant 按 `view: 'summary' | 'page'` 渲染一行摘要或表单。
 * `view` 缺省（如更早的运行时）时退回自绘折叠外壳兜底。
 *
 * 开关走 config 快照（host Config 为权威源），拨动即写 host（无暂存/保存步）：
 * 开关的意图是即时的，不存在官方 staged 文本字段那种「未预览的写入」问题。
 * 时段输入是唯一的例外——它需要连续编辑（22:00 删成 2:00 不能中途落盘），
 * 所以在 blur/回车时才提交。
 */
import * as react from 'react'
// Type-only: pulls the plugin-manager SlotMap merge (the plugins.bundle.config seat).
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import { IconChevronDownOutlineRegular, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { config, setConfig } from './config.ts'
import { previewNoticeSound } from './sound.ts'
import {
  notificationPermission, requestNotificationPermission, sendTestNotification,
} from './notifications.ts'
import type { LocaleT } from './locale.ts'

/** 官方契约的视图选择（插件详情页传入）。 */
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

/**
 * 时段输入：本地 state 承接连续编辑，blur / 回车时才写 host。
 * 浏览器 `type="time"` 自带 `HH:MM` 形态与非空校验，非法值不会出现在这里。
 */
function ClockField({ label, value, onCommit }: { label: string; value: string; onCommit: (next: string) => void }) {
  const [draft, setDraft] = react.useState(value)
  // host 侧被别处改动时（多窗口/重置）同步显示，但不覆盖正在编辑的输入。
  const [focused, setFocused] = react.useState(false)
  react.useEffect(() => { if (!focused) setDraft(value) }, [value, focused])
  const commit = (): void => { if (draft !== value && draft !== '') onCommit(draft) }
  return (
    <label className="dshn-clock">
      <span className="dshn-clockLabel">{label}</span>
      <input
        type="time"
        className="dshn-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commit() }}
        onKeyDown={(event) => { if (event.key === 'Enter') commit() }}
      />
    </label>
  )
}

/** 通知权限行：桌面 App 恒为已授权，浏览器首次需要一次用户手势。 */
function PermissionRow({ t }: { t: LocaleT }) {
  const [state, setState] = react.useState(() => notificationPermission())
  const grant = (): void => {
    void requestNotificationPermission().then((next) => {
      setState(next)
      // 授权成功后立刻给一条真实回执：用户能当场确认通道通了。
      if (next === 'granted') {
        sendTestNotification(t('titleTurn'), t('notifyTest'))
        previewNoticeSound('turn')
      }
    })
  }
  const text = state === 'granted'
    ? t('permGranted')
    : state === 'denied' ? t('permDenied') : state === 'unsupported' ? t('permUnsupported') : t('permDesc')
  return (
    <div className="dshn-row">
      <span className="dshn-rowText">
        <span className="dshn-rowTitle">{t('permTitle')}</span>
        <span className="dshn-rowDesc">{text}</span>
      </span>
      <span className="dshn-field">
        {state === 'default' ? (
          <button type="button" className="dshn-button" onClick={grant}>{t('permGrant')}</button>
        ) : null}
      </span>
    </div>
  )
}

/** 通知设置表单主体：事件开关 + 通用 + 免打扰 + 权限。 */
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

  /** 翻转一个布尔开关（先改快照再写 host，见 setConfig）。 */
  const flip = (field: 'enabled' | 'approval' | 'question' | 'turn' | 'sessionDone' | 'error' | 'subagent' | 'summary' | 'sound' | 'quietHours'): (() => void) =>
    () => setConfig(field, () => { config[field] = !config[field] })

  return (
    <div className="dshn-form">
      {saveFailed ? <p className="dshn-status dshn-err" role="alert">{t('notifySaveFailed')}</p> : null}

      <div className="dshn-group">
        <p className="dshn-groupTitle">{t('groupEvents')}</p>
        <ToggleRow title={t('notifyTitle')} desc={t('notifyDesc')} checked={config.enabled} onChange={flip('enabled')} />
        <ToggleRow title={t('notifyApproval')} checked={config.approval} onChange={flip('approval')} />
        <ToggleRow title={t('notifyQuestion')} checked={config.question} onChange={flip('question')} />
        <ToggleRow title={t('notifyTurn')} checked={config.turn} onChange={flip('turn')} />
        <ToggleRow title={t('notifySessionDone')} checked={config.sessionDone} onChange={flip('sessionDone')} />
        <ToggleRow title={t('notifyError')} checked={config.error} onChange={flip('error')} />
        <ToggleRow title={t('notifySubagent')} desc={t('notifySubagentDesc')} checked={config.subagent} onChange={flip('subagent')} />
      </div>

      <div className="dshn-group">
        <p className="dshn-groupTitle">{t('groupGeneral')}</p>
        <ToggleRow title={t('notifySummary')} desc={t('notifySummaryDesc')} checked={config.summary} onChange={flip('summary')} />
        <div className="dshn-row">
          <span className="dshn-rowText">
            <span className="dshn-rowTitle">{t('notifySound')}</span>
            <span className="dshn-rowDesc">{t('notifySoundDesc')}</span>
          </span>
          <span className="dshn-field">
            <Switch checked={config.sound} onChange={flip('sound')} label={t('notifySound')} />
          </span>
        </div>
        <PermissionRow t={t} />
        <div className="dshn-row">
          <span className="dshn-rowText">
            <span className="dshn-rowTitle">{t('notifyTest')}</span>
          </span>
          <span className="dshn-field">
            <button
              type="button"
              className="dshn-button"
              onClick={() => {
                // 试听同时验证两条通道：横幅（通知权限）与音效（AudioContext）。
                sendTestNotification(t('titleTurn'), t('masterTitle'))
                previewNoticeSound('turn')
              }}
            >
              {t('notifyTest')}
            </button>
          </span>
        </div>
      </div>

      <div className="dshn-group">
        <p className="dshn-groupTitle">{t('groupQuiet')}</p>
        <ToggleRow title={t('notifyQuiet')} desc={t('notifyQuietDesc')} checked={config.quietHours} onChange={flip('quietHours')} />
        {config.quietHours ? (
          <div className="dshn-row">
            <span className="dshn-rowText">
              <span className="dshn-rowDesc">{t('notifyQuietHint')}</span>
            </span>
            <span className="dshn-field">
              <ClockField
                label={t('notifyQuietStart')}
                value={config.quietStart}
                onCommit={(next) => setConfig('quietStart', () => { config.quietStart = next })}
              />
              <ClockField
                label={t('notifyQuietEnd')}
                value={config.quietEnd}
                onCommit={(next) => setConfig('quietEnd', () => { config.quietEnd = next })}
              />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * 旧契约（settings.plugin.item）的折叠外壳兜底：`view` 缺省时（更早的运行时）
 * 官方页面不画标题，由卡片自绘，视觉参数对齐官方 PluginCard
 * （border-l4 / radius 16 / 打开态换背景与描边）。
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
        <IconChevronDownOutlineRegular className={'dshn-chevron' + (open ? ' dshn-open' : '')} />
      </button>
      {open ? <div className="dshn-body">{children}</div> : null}
    </li>
  )
}

/**
 * 通知设置卡片主体。三种渲染路径：
 *   - `view: 'summary'`：插件详情页上的一行摘要；
 *   - `view: 'page'`：插件详情页里的配置表单（官方页面已画标题）；
 *   - 无 `view`：自绘折叠外壳兜底（更早的运行时）。
 *
 * ⚠ `view: 'summary'` 当前**不可达**：官方 PluginManagerPage 对
 * `plugins.bundle.config` 只以 `view: 'page'` 渲染（summary 只用于
 * `plugins.item` 座位）。保留它是防御性的（官方哪天在插件列表页也渲染本座位的
 * 摘要，这里就不用改代码），但**不要为它单独维护文案**——`masterDesc` 同时被
 * 无 view 的折叠外壳使用，不会变成死词条。
 *
 * @param props.t - locale 绑定（闭包传入）。
 * @param props.view - 插件详情页传入的视图选择。
 * @returns 卡片内容。
 */
export function NotifySettingsCard({ t, view }: { t: LocaleT; view?: NotifyCardView | undefined }) {
  if (view === 'summary') return <>{t('masterDesc')}</>
  const form = <NotifyForm t={t} />
  if (view === 'page') return form
  return <LegacyCardShell t={t}>{form}</LegacyCardShell>
}
