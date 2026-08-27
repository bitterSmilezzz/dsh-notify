/**
 * dsh-notify — settings card styles (single `<style data-plugin="dsh-notify">`
 * tag, injected by the client apply and removed again on unload). Class names
 * are prefixed `dshn-` so they cannot collide with other plugins' styles.
 * Colors come only from `--dsw-*` theme tokens.
 */

export const CSS = `
.dshn-card{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;overflow:hidden;list-style:none}
.dshn-header{width:100%;box-sizing:border-box;display:flex;align-items:center;gap:12px;border:0;background:none;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;padding:14px 16px;cursor:pointer}
.dshn-header:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dshn-headtext{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.dshn-name{font-size:15px;line-height:1.4;font-weight:600}
.dshn-desc{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}
.dshn-chevron{flex:none;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);transform:rotate(0deg);transition:transform .15s ease}
.dshn-chevron.dshn-open{transform:rotate(180deg)}
.dshn-body{box-sizing:border-box;border-top:1px solid var(--dsw-alias-border-l2);padding:4px 16px 14px;display:grid;gap:4px}
.dshn-group{display:grid;gap:4px;padding-top:10px}
.dshn-groupTitle{margin:0;font-size:12px;font-weight:600;color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.04em}
.dshn-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.dshn-row:last-child{border-bottom:0}
.dshn-rowText{flex:1;min-width:0;display:grid;gap:2px}
.dshn-rowTitle{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary)}
.dshn-rowDesc{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12.5px;line-height:18px}
.dshn-field{display:flex;align-items:center;gap:8px}
.dshn-field input[type=checkbox]{flex:none;width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary)}
.dshn-button{appearance:none;height:30px;border:1px solid transparent;border-radius:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);font:inherit;font-size:13px;line-height:1.5;padding:0 14px;cursor:pointer}
.dshn-button:hover:not(:disabled){filter:brightness(1.1)}
.dshn-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dshn-button:disabled{opacity:.4;cursor:default}
.dshn-status{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dshn-status.dshn-err{color:var(--dsw-alias-state-danger-fill,#F87171)}
`