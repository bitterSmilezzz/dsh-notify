/**
 * dsh-notify — settings card (settings.plugin.item, key: 'notify').
 *
 * 「设置 → 插件 → 配置」下的折叠卡片：桌面通知开关分组 + 试听 + 权限入口。
 * 所有开关读写 config 快照（host settings 为权威源）；声音试听走 sound.ts。
 */
import * as react from 'react'
// Type-only: pulls the ui-settings-plugins SlotMap merge (the settings.plugin.item card seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { config, setConfig } from './config.ts'
import { playSound } from './sound.ts'
import type { LocaleT } from './locale.ts'

/** 一个开关行。label 包住整行：点击行内任意处（标题/描述/空白）都可切换，
 *  而不是只点 checkbox 那一小块；Tab 焦点落在 input 上，Enter/Space 切换。 */
function ToggleRow({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="dshn-row">
      <span className="dshn-rowText">
        <span className="dshn-rowTitle">{title}</span>
        {desc ? <span className="dshn-rowDesc">{desc}</span> : null}
      </span>
      <span className="dshn-field">
        {/* role="switch" 让读屏按「开关」语义播报（on/off），与行内视觉一致；
            原生 checkbox 的隐式 role 是 checkbox，显式 role 覆盖后读屏读
            aria-checked。aria-checked 与 checked 绑定同一 prop 同源显式同步：
            任何状态变化（点击/键盘切换）都会经 setConfig → 重渲染同时更新
            两者，读屏播报与视觉勾选不会分叉。 */}
        <input type="checkbox" role="switch" aria-label={title} aria-checked={checked} checked={checked} onChange={onChange} />
      </span>
    </label>
  )
}

/** 宿主是否为 macOS（用于「去系统设置开启」入口的可见性判断：
 *  x-apple.systempreferences 深链只在 macOS 有效，Windows/Linux 展示了也无用）。 */
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent)

/**
 * 通知设置卡片主体。
 * @param props - 注册时的 locale 绑定（闭包传入）。
 * @returns 折叠卡片。
 */
export function NotifySettingsCard({ t }: { t: LocaleT }) {
  const [open, setOpen] = react.useState(false)
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
    <li className="dshn-card">
      <button
        type="button"
        className="dshn-header"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="dshn-headtext">
          <span className="dshn-name">{t('masterTitle')}</span>
          <p className="dshn-desc">{t('masterDesc')}</p>
        </span>
        <svg
          className={'dshn-chevron' + (open ? ' dshn-open' : '')}
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3.5 5.75 8 10.25l4.5-4.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="dshn-body">
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
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={t('notifySound')}
                  aria-checked={config.sound}
                  checked={config.sound}
                  onChange={() => setConfig('sound', () => { config.sound = !config.sound })}
                />
                <button type="button" className="dshn-button" onClick={() => playSound('sessionDone', true)}>
                  {t('notifyTest')}
                </button>
              </div>
            </div>
            {/* 与其他通知源的冲突策略：auto=探测到即自动暂停（防双份），
                mine=忽略探测始终用自己的。探测由 host 做，auto 暂停时会弹
                系统提示告知用户（见 index.ts onProbeChange）。 */}
            <div className="dshn-row dshn-overlapRow">
              <div className="dshn-rowText">
                <span className="dshn-rowTitle">{t('overlapTitle')}</span>
                <p className="dshn-rowDesc">{t('overlapDesc')}</p>
              </div>
              <div className="dshn-field dshn-overlap" role="radiogroup" aria-label={t('overlapTitle')}>
                <label className="dshn-overlapItem">
                  <input
                    type="radio"
                    name="dshn-overlap"
                    value="auto"
                    checked={config.overlap === 'auto'}
                    onChange={() => setConfig('overlap', () => { config.overlap = 'auto' })}
                  />
                  <span>{t('overlapAuto')}</span>
                </label>
                <label className="dshn-overlapItem">
                  <input
                    type="radio"
                    name="dshn-overlap"
                    value="mine"
                    checked={config.overlap === 'mine'}
                    onChange={() => setConfig('overlap', () => { config.overlap = 'mine' })}
                  />
                  <span>{t('overlapMine')}</span>
                </label>
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
      ) : null}
    </li>
  )
}