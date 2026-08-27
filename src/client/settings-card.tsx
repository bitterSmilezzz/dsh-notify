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

/** 一个开关行。 */
function ToggleRow({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="dshn-row">
      <div className="dshn-rowText">
        <span className="dshn-rowTitle">{title}</span>
        {desc ? <p className="dshn-rowDesc">{desc}</p> : null}
      </div>
      <label className="dshn-field">
        <input type="checkbox" checked={checked} onChange={onChange} />
      </label>
    </div>
  )
}

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
    const onConfig = () => force()
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
          {saveFailed ? <p className="dshn-status dshn-err" role="alert">{t('notifyTitle')}</p> : null}
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
                <p className="dshn-rowDesc">{t('notifySoundDesc')}</p>
              </div>
              <div className="dshn-field">
                <input
                  type="checkbox"
                  checked={config.sound}
                  onChange={() => setConfig('sound', () => { config.sound = !config.sound })}
                />
                <button type="button" className="dshn-button" onClick={() => playSound('sessionDone')}>
                  {t('notifyTest')}
                </button>
              </div>
            </div>
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
          </div>
        </div>
      ) : null}
    </li>
  )
}