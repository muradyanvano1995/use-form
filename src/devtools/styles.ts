/**
 * DevTools styles as a JS string (not a CSS file) so `sideEffects: false` stays valid
 * and bundlers cannot drop the inspector theme as an unused stylesheet side effect.
 * Nested rules + short tokens keep the payload small; public hooks remain `--form-devtools-*`.
 */
export const DEVTOOLS_STYLES =
  '[data-form-devtools]{' +
  '--fd-bg:var(--form-devtools-bg,#111827);' +
  '--fd-sf:var(--form-devtools-surface,#1a2234);' +
  '--fd-el:var(--form-devtools-elevated,#243049);' +
  '--fd-bd:var(--form-devtools-border,#334155);' +
  '--fd-fg:var(--form-devtools-fg,#e5eefb);' +
  '--fd-mu:var(--form-devtools-muted,#94a3b8);' +
  '--fd-ac:var(--form-devtools-accent,#2dd4bf);' +
  '--fd-on:var(--form-devtools-on-accent,#fff);' +
  '--fd-ok:var(--form-devtools-ok,#34d399);' +
  '--fd-wn:var(--form-devtools-warn,#fbbf24);' +
  '--fd-er:var(--form-devtools-error,#fb7185);' +
  '--fd-in:var(--form-devtools-info,#38bdf8);' +
  '--fd-ky:var(--form-devtools-key,#7dd3fc);' +
  '--fd-st:var(--form-devtools-string,#86efac);' +
  '--fd-nu:var(--form-devtools-number,#fdba74);' +
  '--fd-bo:var(--form-devtools-boolean,#c4b5fd);' +
  '--fd-sh:var(--form-devtools-shadow,0 18px 50px #02061773);' +
  '--fd-sans:ui-sans-serif,system-ui,sans-serif;' +
  '--fd-mono:ui-monospace,Menlo,Consolas,monospace;' +
  'font:12.5px/1.45 var(--fd-sans);color:var(--fd-fg);' +
  '*,*::before,*::after{box-sizing:border-box}' +
  '.fd-shell{position:relative;display:flex;flex-direction:column;min-height:0;max-height:100%;background:var(--fd-sf);border:1px solid var(--fd-bd);border-radius:16px;box-shadow:var(--fd-sh);overflow:hidden}' +
  '.fd-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;flex:0 0 auto;background:var(--fd-el);border-bottom:1px solid var(--fd-bd)}' +
  '.fd-brand{display:flex;align-items:center;gap:8px;min-width:0}' +
  '.fd-mark{display:block;width:10px;height:10px;border-radius:999px;flex:0 0 auto;background:var(--fd-ac);border:2px solid #042f2e;box-shadow:0 0 0 1px var(--fd-ac)}' +
  '.fd-title{margin:0;font-size:12px;font-weight:700;letter-spacing:.02em;white-space:nowrap}' +
  '.fd-subtitle{margin:0;color:var(--fd-mu);font-size:10.5px;white-space:nowrap}' +
  '.fd-header-actions{display:flex;align-items:center;gap:6px}' +
  'button.fd-icon-btn{appearance:none;border:1px solid var(--fd-bd);background:var(--fd-bg);color:var(--fd-fg);border-radius:10px;padding:6px 10px;cursor:pointer;font:inherit}' +
  'button.fd-icon-btn:hover:not(:disabled){background:var(--fd-sf);border-color:var(--fd-ac)}' +
  'button.fd-icon-btn:focus-visible,button.fd-tab:focus-visible,button.fd-collapsed:focus-visible{outline:2px solid var(--fd-ac);outline-offset:2px}' +
  '.fd-body{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden}' +
  '.fd-status{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px;border-bottom:1px solid var(--fd-bd);background:var(--fd-bg)}' +
  '.fd-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 9px;border:1px solid var(--fd-bd);font-size:10.5px;font-weight:600}' +
  '.fd-chip-ok{color:#047857;background:#bbf7d0}' +
  '.fd-chip-warn{color:#b45309;background:#fef3c7}' +
  '.fd-chip-error{color:#be123c;background:#ffe4e6}' +
  '.fd-chip-info{color:#0369a1;background:#e0f2fe}' +
  '.fd-chip-muted{color:#475569;background:#e2e8f0}' +
  '.fd-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px;border-bottom:1px solid var(--fd-bd);background:var(--fd-sf)}' +
  'button.fd-tab{appearance:none;border:0;background:0 0;color:var(--fd-mu);border-radius:999px;padding:6px 11px;cursor:pointer;font:inherit;font-weight:600;white-space:nowrap}' +
  'button.fd-tab:hover:not(:disabled){color:var(--fd-fg);background:var(--fd-el)}' +
  'button.fd-tab[aria-selected=true],button.fd-tab[aria-selected=true]:hover:not(:disabled){color:var(--fd-on);background:var(--fd-ac)}' +
  '.fd-panel{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;padding:10px 12px 12px;background:var(--fd-bg)}' +
  '.fd-empty{color:var(--fd-mu);padding:8px 2px;margin:0}' +
  '.fd-tree{margin:0;padding:0 0 0 12px;list-style:none;border-left:1px solid var(--fd-bd)}' +
  '.fd-tree-root{padding-left:0;border-left:0}' +
  '.fd-row{display:grid;grid-template-columns:max-content minmax(0,1fr);column-gap:8px;align-items:start;padding:3px 0;min-width:0}' +
  '.fd-row-block{display:block;padding:3px 0;min-width:0}' +
  '.fd-row-value{min-width:0;overflow-wrap:anywhere;font:12px/1.45 var(--fd-mono)}' +
  '.fd-key,.fd-punct{font:12px/1.45 var(--fd-mono)}' +
  '.fd-key{color:var(--fd-ky)}' +
  '.fd-punct{color:var(--fd-mu)}' +
  '.fd-string{color:var(--fd-st)}' +
  '.fd-number{color:var(--fd-nu)}' +
  '.fd-boolean{color:var(--fd-bo)}' +
  '.fd-null{color:var(--fd-mu);font-style:italic}' +
  '.fd-badge{display:inline-flex;align-items:center;gap:4px;max-width:100%;border-radius:6px;padding:2px 7px;font-size:10.5px;font-weight:700;text-transform:uppercase;border:1px solid var(--fd-bd);overflow-wrap:anywhere}' +
  '.fd-badge-file{color:var(--fd-in);background:#38bdf829}' +
  '.fd-badge-redacted{color:#78350f;background:#fef3c7}' +
  '.fd-badge-meta{color:var(--fd-mu);background:#94a3b824}' +
  '.fd-cards{display:flex;flex-direction:column;gap:8px}' +
  '.fd-card{border:1px solid #fb718559;border-radius:12px;background:#fb718514;padding:10px 12px;min-width:0}' +
  '.fd-card-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px;margin-bottom:6px}' +
  '.fd-card-path{margin:0;font:700 12px/1.4 var(--fd-mono);color:var(--fd-ky);overflow-wrap:anywhere}' +
  '.fd-card-msg{margin:0;font-size:13px;font-weight:600;color:var(--fd-er);overflow-wrap:anywhere}' +
  '.fd-card-meta{display:flex;flex-wrap:wrap;gap:4px}' +
  '.fd-pill{display:inline-flex;align-items:center;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--fd-mu);background:#94a3b81f;border:1px solid var(--fd-bd)}' +
  '.fd-issues{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}' +
  '.fd-issue{border-top:1px solid #fb718540;padding-top:6px}' +
  '.fd-issue-label{margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--fd-mu)}' +
  '.fd-issue-msg{margin:0 0 4px;font-size:12px;color:var(--fd-er);overflow-wrap:anywhere}' +
  'button.fd-collapsed{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;background:var(--fd-sf);border:1px solid var(--fd-bd);box-shadow:var(--fd-sh);color:var(--fd-fg);cursor:pointer;font:inherit;font-weight:700}' +
  'button.fd-collapsed:hover:not(:disabled){border-color:var(--fd-ac);background:var(--fd-el)}' +
  'button.fd-collapsed .fd-chip{pointer-events:none}' +
  '&[data-position=inline]{button.fd-collapsed{border-radius:12px;width:100%;justify-content:center}.fd-shell{max-height:min(70vh,640px)}}' +
  '&[data-floating]{touch-action:none;.fd-shell{height:100%;max-height:none}.fd-header{cursor:grab;user-select:none}.fd-header.is-dragging{cursor:grabbing}.fd-header-actions,.fd-header-actions *{cursor:pointer;user-select:auto}}' +
  '.fd-resize{position:absolute;right:2px;bottom:2px;width:14px;height:14px;padding:0;border:0;border-radius:3px 0 12px;background:linear-gradient(135deg,transparent 55%,var(--fd-ac) 0);cursor:nwse-resize;appearance:none}' +
  '.fd-resize:focus-visible{outline:2px solid var(--fd-ac);outline-offset:1px}' +
  '}'
