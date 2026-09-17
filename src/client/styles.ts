/**
 * dsh-notify — settings card styles (single `<style data-plugin-css="@bittersmilezzz/dsh-notify/client">`
 * tag, injected by the client apply and removed again on unload). Class names
 * are prefixed `dshn-` so they cannot collide with other plugins' styles.
 * Colors come only from `--dsw-*` theme tokens.
 *
 * 参数对齐官方插件配置卡片（ui-settings-plugins 的 PluginCard / fields 与
 * SubagentCard 的 section）：卡片描边 0.5px `border-l4`、圆角 16px、悬停与
 * 打开态换描边/背景，头部 14px/16px 内边距、标题 15px/600、说明 13px
 * `label-tertiary`，正文与字段分隔线 0.5px `border-l2`，次要按钮 outline 形态。
 */

export const CSS = `
/* 旧契约（settings.plugin.item）的折叠卡片外壳；新契约由官方页面画外壳，
   这里只服务卡片自绘路径与表单内部排版。 */
.dshn-card{box-sizing:border-box;list-style:none;border:0.5px solid var(--dsw-alias-border-l4);border-radius:16px;background:var(--dsw-alias-bg-layer-3);transition:border-color .16s,background .16s}
.dshn-card:hover{border-color:var(--dsw-alias-label-dimmed)}
.dshn-cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}
.dshn-header{width:100%;box-sizing:border-box;appearance:none;display:flex;align-items:center;gap:12px;border:0;border-radius:12px;background:none;color:inherit;font:inherit;text-align:left;padding:14px 16px;cursor:pointer}
.dshn-header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.dshn-headtext{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.dshn-name{font-size:15px;font-weight:600;line-height:1.4;color:var(--dsw-alias-label-primary)}
.dshn-desc{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}
.dshn-chevron{flex:none;color:var(--dsw-alias-label-tertiary);transition:transform .16s}
.dshn-chevron.dshn-open{transform:rotate(180deg)}
.dshn-body{border-top:0.5px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}
/* 新契约（plugins.bundle.config）的表单外层：官方页面已画标题与面包屑，
   这里只给表单上下留白（对齐官方 SubagentCard 的 section 16px）。 */
.dshn-form{box-sizing:border-box;display:grid;gap:4px;padding:16px 0}
.dshn-group{display:grid;gap:4px}
.dshn-groupTitle{margin:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.04em}
.dshn-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:0.5px solid var(--dsw-alias-border-l2)}
.dshn-row:last-child{border-bottom:0}
.dshn-rowText{flex:1;min-width:0;display:grid;gap:2px}
.dshn-rowTitle{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary)}
.dshn-rowDesc{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:18px}
.dshn-field{display:flex;align-items:center;gap:8px}
/* 次要操作按钮：对齐官方卡片内 discard 的 outline 形态。 */
.dshn-button{appearance:none;height:28px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:none;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:1.5;padding:0 14px;cursor:pointer}
.dshn-button:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}
.dshn-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dshn-button:disabled{opacity:.4;cursor:default}
.dshn-status{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dshn-status.dshn-err{color:var(--dsw-alias-label-error)}
`
