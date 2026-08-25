import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useFormState, type FormControl, type FormValues } from '../hooks/useForm'
import { resolveControl, useOptionalFormContext } from '../hooks/useForm/formContext.ts'
import { computeDirtyFields } from '../hooks/useForm/utilities.ts'
import {
  safeSerialize,
  type DevToolsPosition,
  type DevToolsRedactionPredicate,
  type SafeSerializeOptions,
} from './safeSerialize.ts'

export type { DevToolsPosition, DevToolsRedactionPredicate }

export type FormDevToolsProps<T extends FormValues = FormValues> = {
  control?: FormControl<T>
  position?: DevToolsPosition
  initiallyOpen?: boolean
  enabled?: boolean
  redact?: readonly string[] | DevToolsRedactionPredicate
  redactFiles?: boolean
  /** Omit File.name from serialized metadata. Filenames can themselves be sensitive. */
  hideFileNames?: boolean
}

type InspectorSnapshot<T extends FormValues> = {
  values: T
  defaultValues: T
  errors: unknown
  errorDetails: unknown
  rootError: string | undefined
  rootErrorDetails: unknown
  touched: unknown
  isDirty: boolean
  isValid: boolean
  isSubmitting: boolean
  isValidating: boolean
  submitCount: number
  isLoadingDefaults: boolean
  isDefaultsReady: boolean
  defaultValuesError: string | undefined
}

type PanelTab = 'values' | 'errors' | 'details' | 'state' | 'defaults'

const TABS: ReadonlyArray<{ id: PanelTab; label: string }> = [
  { id: 'values', label: 'Values' },
  { id: 'errors', label: 'Errors' },
  { id: 'details', label: 'Details' },
  { id: 'state', label: 'State' },
  { id: 'defaults', label: 'Defaults' },
]

function snapshotsEqual<T extends FormValues>(
  a: InspectorSnapshot<T>,
  b: InspectorSnapshot<T>,
): boolean {
  return (
    a.values === b.values &&
    a.defaultValues === b.defaultValues &&
    a.errors === b.errors &&
    a.errorDetails === b.errorDetails &&
    a.rootError === b.rootError &&
    a.rootErrorDetails === b.rootErrorDetails &&
    a.touched === b.touched &&
    a.isDirty === b.isDirty &&
    a.isValid === b.isValid &&
    a.isSubmitting === b.isSubmitting &&
    a.isValidating === b.isValidating &&
    a.submitCount === b.submitCount &&
    a.isLoadingDefaults === b.isLoadingDefaults &&
    a.isDefaultsReady === b.isDefaultsReady &&
    a.defaultValuesError === b.defaultValuesError
  )
}

function countMappedKeys(value: unknown): number {
  if (value == null || typeof value !== 'object') return 0
  return Object.keys(value).length
}

function isEmptyPayload(value: unknown): boolean {
  if (value == null) return true
  if (typeof value !== 'object') return false
  if (Array.isArray(value)) return value.length === 0
  return Object.keys(value).length === 0
}

/** Drop undefined entries so the tree does not show empty rootError / nullish noise. */
function omitUndefinedEntries(value: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (child !== undefined) next[key] = child
  }
  return next
}

type FloatFrame = {
  x: number
  y: number
  width: number
  height: number
}

const FLOAT_MARGIN = 16
const FLOAT_DEFAULT_WIDTH = 400
const FLOAT_MIN_WIDTH = 280
const FLOAT_MIN_HEIGHT = 220
const FLOAT_OPEN_STAGGER = 28
const FLOAT_COLLAPSED_STACK = 52
const FLOAT_Z_BASE = 100_000

let floatZCounter = FLOAT_Z_BASE
const floatOpenStaggerByKey = new Map<string, number>()
const floatCollapsedSlotByKey = new Map<string, number>()

function nextFloatZIndex(): number {
  floatZCounter += 1
  return floatZCounter
}

function takeOpenStagger(key: string): number {
  const existing = floatOpenStaggerByKey.get(key)
  if (existing != null) return existing
  const used = new Set(floatOpenStaggerByKey.values())
  let index = 0
  while (used.has(index)) index += 1
  floatOpenStaggerByKey.set(key, index)
  return index
}

function releaseOpenStagger(key: string): void {
  floatOpenStaggerByKey.delete(key)
}

function takeCollapsedSlot(key: string): number {
  const existing = floatCollapsedSlotByKey.get(key)
  if (existing != null) return existing
  const used = new Set(floatCollapsedSlotByKey.values())
  let index = 0
  while (used.has(index)) index += 1
  floatCollapsedSlotByKey.set(key, index)
  return index
}

function releaseCollapsedSlot(key: string): void {
  floatCollapsedSlotByKey.delete(key)
}

function releaseFloatInstance(key: string): void {
  releaseOpenStagger(key)
  releaseCollapsedSlot(key)
}

function defaultFloatFrame(
  corner: Exclude<DevToolsPosition, 'inline'>,
  stagger = 0,
): FloatFrame {
  const width = FLOAT_DEFAULT_WIDTH
  const height = Math.min(typeof window === 'undefined' ? 480 : window.innerHeight * 0.72, 680)
  const viewportWidth = typeof window === 'undefined' ? width + FLOAT_MARGIN * 2 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? height + FLOAT_MARGIN * 2 : window.innerHeight
  const offset = stagger * FLOAT_OPEN_STAGGER
  return {
    width,
    height,
    x:
      corner === 'bottom-left'
        ? FLOAT_MARGIN + offset
        : Math.max(FLOAT_MARGIN, viewportWidth - width - FLOAT_MARGIN - offset),
    y: Math.max(FLOAT_MARGIN, viewportHeight - height - FLOAT_MARGIN - offset),
  }
}

function clampFloatFrame(frame: FloatFrame): FloatFrame {
  const viewportWidth = typeof window === 'undefined' ? frame.width + FLOAT_MARGIN * 2 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? frame.height + FLOAT_MARGIN * 2 : window.innerHeight
  const width = Math.min(Math.max(frame.width, FLOAT_MIN_WIDTH), Math.max(FLOAT_MIN_WIDTH, viewportWidth - FLOAT_MARGIN * 2))
  const height = Math.min(
    Math.max(frame.height, FLOAT_MIN_HEIGHT),
    Math.max(FLOAT_MIN_HEIGHT, viewportHeight - FLOAT_MARGIN * 2),
  )
  const maxX = Math.max(FLOAT_MARGIN, viewportWidth - width - FLOAT_MARGIN)
  const maxY = Math.max(FLOAT_MARGIN, viewportHeight - height - FLOAT_MARGIN)
  return {
    width,
    height,
    x: Math.min(Math.max(frame.x, FLOAT_MARGIN), maxX),
    y: Math.min(Math.max(frame.y, FLOAT_MARGIN), maxY),
  }
}

function panelStyle(options: {
  position: DevToolsPosition
  open: boolean
  frame: FloatFrame | null
  zIndex: number
  collapsedSlot: number | null
}): CSSProperties {
  const { position, open, frame, zIndex, collapsedSlot } = options
  if (position === 'inline') {
    return {
      position: 'relative',
      marginTop: '0.85rem',
      width: '100%',
      maxWidth: '100%',
    }
  }
  if (!open) {
    return {
      position: 'fixed',
      zIndex,
      right: FLOAT_MARGIN,
      bottom: FLOAT_MARGIN + (collapsedSlot ?? 0) * FLOAT_COLLAPSED_STACK,
      width: 'auto',
      height: 'auto',
    }
  }
  if (frame) {
    return {
      position: 'fixed',
      zIndex,
      left: frame.x,
      top: frame.y,
      width: frame.width,
      height: frame.height,
      maxWidth: `calc(100vw - ${FLOAT_MARGIN * 2}px)`,
      maxHeight: `calc(100vh - ${FLOAT_MARGIN * 2}px)`,
      display: 'flex',
      flexDirection: 'column',
    }
  }
  return {
    position: 'fixed',
    zIndex,
    bottom: FLOAT_MARGIN,
    [position === 'bottom-left' ? 'left' : 'right']: FLOAT_MARGIN,
    width: FLOAT_DEFAULT_WIDTH,
    maxWidth: `calc(100vw - ${FLOAT_MARGIN * 2}px)`,
    maxHeight: 'min(72vh, 680px)',
    display: 'flex',
    flexDirection: 'column',
  }
}

function defaultFloatCorner(position: DevToolsPosition): Exclude<DevToolsPosition, 'inline'> {
  return position === 'bottom-left' ? 'bottom-left' : 'bottom-right'
}

const STYLES =
  '[data-form-devtools]{--fd-bg:var(--form-devtools-bg,#111827);--fd-surface:var(--form-devtools-surface,#1a2234);--fd-elevated:var(--form-devtools-elevated,#243049);--fd-border:var(--form-devtools-border,#334155);--fd-fg:var(--form-devtools-fg,#e5eefb);--fd-muted:var(--form-devtools-muted,#94a3b8);--fd-accent:var(--form-devtools-accent,#2dd4bf);--fd-on-accent:var(--form-devtools-on-accent,#042f2e);--fd-ok:var(--form-devtools-ok,#34d399);--fd-warn:var(--form-devtools-warn,#fbbf24);--fd-error:var(--form-devtools-error,#fb7185);--fd-info:var(--form-devtools-info,#38bdf8);--fd-key:var(--form-devtools-key,#7dd3fc);--fd-string:var(--form-devtools-string,#86efac);--fd-number:var(--form-devtools-number,#fdba74);--fd-boolean:var(--form-devtools-boolean,#c4b5fd);--fd-null:var(--form-devtools-null,#94a3b8);--fd-shadow:var(--form-devtools-shadow,0 18px 50px rgba(2,6,23,.45));font:12.5px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--fd-fg)}' +
  '[data-form-devtools] *,[data-form-devtools] *::before,[data-form-devtools] *::after{box-sizing:border-box}' +
  '[data-form-devtools] .fd-shell{position:relative;display:flex;flex-direction:column;min-height:0;max-height:100%;background:var(--fd-surface);border:1px solid var(--fd-border);border-radius:16px;box-shadow:var(--fd-shadow);overflow:hidden}' +
  '[data-form-devtools] .fd-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;flex:0 0 auto;background:var(--fd-elevated);border-bottom:1px solid var(--fd-border)}' +
  '[data-form-devtools] .fd-brand{display:flex;align-items:center;gap:8px;min-width:0}' +
  '[data-form-devtools] .fd-mark{display:block;width:10px;height:10px;border-radius:999px;flex:0 0 auto;background:var(--fd-accent);border:2px solid var(--fd-on-accent);box-shadow:0 0 0 1px var(--fd-accent)}' +
  '[data-form-devtools] .fd-title{margin:0;font-size:12px;font-weight:700;letter-spacing:.02em;white-space:nowrap}' +
  '[data-form-devtools] .fd-subtitle{margin:0;color:var(--fd-muted);font-size:10.5px;white-space:nowrap}' +
  '[data-form-devtools] .fd-header-actions{display:flex;align-items:center;gap:6px;flex:0 0 auto}' +
  '[data-form-devtools] button.fd-icon-btn{appearance:none;border:1px solid var(--fd-border);background:var(--fd-bg);color:var(--fd-fg);border-radius:10px;padding:6px 10px;cursor:pointer;font:inherit}' +
  '[data-form-devtools] button.fd-icon-btn:hover:not(:disabled){background:var(--fd-surface);border-color:var(--fd-accent);color:var(--fd-fg)}' +
  '[data-form-devtools] button.fd-icon-btn:focus-visible,[data-form-devtools] button.fd-tab:focus-visible,[data-form-devtools] button.fd-collapsed:focus-visible{outline:2px solid var(--fd-accent);outline-offset:2px}' +
  '[data-form-devtools] .fd-body{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden}' +
  '[data-form-devtools] .fd-status{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px;flex:0 0 auto;border-bottom:1px solid var(--fd-border);background:var(--fd-bg)}' +
  '[data-form-devtools] .fd-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 9px;border:1px solid transparent;font-size:10.5px;font-weight:600}' +
  '[data-form-devtools] .fd-chip::before{content:"";width:6px;height:6px;border-radius:999px;background:currentColor}' +
  '[data-form-devtools] .fd-chip-ok{color:var(--fd-ok);background:color-mix(in srgb,var(--fd-ok) 16%,var(--fd-bg));border-color:color-mix(in srgb,var(--fd-ok) 40%,var(--fd-border))}' +
  '[data-form-devtools] .fd-chip-warn{color:var(--fd-warn);background:color-mix(in srgb,var(--fd-warn) 16%,var(--fd-bg));border-color:color-mix(in srgb,var(--fd-warn) 40%,var(--fd-border))}' +
  '[data-form-devtools] .fd-chip-error{color:var(--fd-error);background:color-mix(in srgb,var(--fd-error) 16%,var(--fd-bg));border-color:color-mix(in srgb,var(--fd-error) 40%,var(--fd-border))}' +
  '[data-form-devtools] .fd-chip-info{color:var(--fd-info);background:color-mix(in srgb,var(--fd-info) 16%,var(--fd-bg));border-color:color-mix(in srgb,var(--fd-info) 40%,var(--fd-border))}' +
  '[data-form-devtools] .fd-chip-muted{color:var(--fd-muted);background:color-mix(in srgb,var(--fd-muted) 14%,var(--fd-bg));border-color:var(--fd-border)}' +
  '[data-form-devtools] .fd-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px;flex:0 0 auto;border-bottom:1px solid var(--fd-border);background:var(--fd-surface)}' +
  '[data-form-devtools] button.fd-tab{appearance:none;border:0;background:transparent;color:var(--fd-muted);border-radius:999px;padding:6px 11px;cursor:pointer;font:inherit;font-weight:600;white-space:nowrap}' +
  '[data-form-devtools] button.fd-tab:hover:not(:disabled){color:var(--fd-fg);background:var(--fd-elevated)}' +
  '[data-form-devtools] button.fd-tab[aria-selected="true"],[data-form-devtools] button.fd-tab[aria-selected="true"]:hover:not(:disabled){color:var(--fd-on-accent);background:var(--fd-accent)}' +
  '[data-form-devtools] .fd-panel{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;padding:10px 12px 12px;background:var(--fd-bg);font:12.5px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}' +
  '[data-form-devtools] .fd-empty{color:var(--fd-muted);font-family:inherit;padding:8px 2px;margin:0}' +
  '[data-form-devtools] .fd-tree{margin:0;padding:0 0 0 12px;list-style:none;border-left:1px solid var(--fd-border)}' +
  '[data-form-devtools] .fd-tree-root{padding-left:0;border-left:0}' +
  '[data-form-devtools] .fd-row{display:grid;grid-template-columns:max-content minmax(0,1fr);column-gap:8px;align-items:start;padding:3px 0;min-width:0}' +
  '[data-form-devtools] .fd-row-block{display:block;padding:3px 0;min-width:0}' +
  '[data-form-devtools] .fd-row-value{min-width:0;overflow-wrap:anywhere;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}' +
  '[data-form-devtools] .fd-key{color:var(--fd-key);font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}' +
  '[data-form-devtools] .fd-punct{color:var(--fd-muted);font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}' +
  '[data-form-devtools] .fd-string{color:var(--fd-string)}' +
  '[data-form-devtools] .fd-number{color:var(--fd-number)}' +
  '[data-form-devtools] .fd-boolean{color:var(--fd-boolean)}' +
  '[data-form-devtools] .fd-null{color:var(--fd-muted);font-style:italic}' +
  '[data-form-devtools] .fd-badge{display:inline-flex;align-items:center;gap:4px;max-width:100%;border-radius:6px;padding:2px 7px;font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;border:1px solid transparent;overflow-wrap:anywhere}' +
  '[data-form-devtools] .fd-badge-file{color:var(--fd-info);background:color-mix(in srgb,var(--fd-info) 16%,var(--fd-bg));border-color:color-mix(in srgb,var(--fd-info) 40%,var(--fd-border))}' +
  '[data-form-devtools] .fd-badge-redacted{color:var(--fd-warn);background:color-mix(in srgb,var(--fd-warn) 16%,var(--fd-bg));border-color:color-mix(in srgb,var(--fd-warn) 40%,var(--fd-border))}' +
  '[data-form-devtools] .fd-badge-meta{color:var(--fd-muted);background:color-mix(in srgb,var(--fd-muted) 14%,var(--fd-bg));border-color:var(--fd-border)}' +
  '[data-form-devtools] .fd-cards{display:flex;flex-direction:column;gap:8px}' +
  '[data-form-devtools] .fd-card{border:1px solid color-mix(in srgb,var(--fd-error) 35%,var(--fd-border));border-radius:12px;background:color-mix(in srgb,var(--fd-error) 8%,var(--fd-surface));padding:10px 12px;min-width:0}' +
  '[data-form-devtools] .fd-card-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px;margin-bottom:6px}' +
  '[data-form-devtools] .fd-card-path{margin:0;font:700 12px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--fd-key);overflow-wrap:anywhere}' +
  '[data-form-devtools] .fd-card-msg{margin:0;font-size:13px;font-weight:600;color:var(--fd-error);overflow-wrap:anywhere}' +
  '[data-form-devtools] .fd-card-meta{display:flex;flex-wrap:wrap;gap:4px}' +
  '[data-form-devtools] .fd-pill{display:inline-flex;align-items:center;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;color:var(--fd-muted);background:color-mix(in srgb,var(--fd-muted) 12%,var(--fd-bg));border:1px solid var(--fd-border)}' +
  '[data-form-devtools] .fd-issues{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}' +
  '[data-form-devtools] .fd-issue{border-top:1px solid color-mix(in srgb,var(--fd-error) 25%,var(--fd-border));padding-top:6px}' +
  '[data-form-devtools] .fd-issue-label{margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--fd-muted)}' +
  '[data-form-devtools] .fd-issue-msg{margin:0 0 4px;font-size:12px;color:var(--fd-error);overflow-wrap:anywhere}' +
  '[data-form-devtools] button.fd-collapsed{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;background:var(--fd-surface);border:1px solid var(--fd-border);box-shadow:var(--fd-shadow);color:var(--fd-fg);cursor:pointer;font:inherit;font-weight:700}' +
  '[data-form-devtools] button.fd-collapsed:hover:not(:disabled){border-color:var(--fd-accent);background:var(--fd-elevated);color:var(--fd-fg)}' +
  '[data-form-devtools] button.fd-collapsed .fd-chip{pointer-events:none}' +
  '[data-form-devtools][data-position="inline"] button.fd-collapsed{border-radius:12px;width:100%;justify-content:center}' +
  '[data-form-devtools][data-position="inline"] .fd-shell{max-height:min(70vh,640px)}' +
  '[data-form-devtools][data-floating]{touch-action:none}' +
  '[data-form-devtools][data-floating] .fd-shell{height:100%;max-height:none}' +
  '[data-form-devtools][data-floating] .fd-header{cursor:grab;user-select:none}' +
  '[data-form-devtools][data-floating] .fd-header.is-dragging{cursor:grabbing}' +
  '[data-form-devtools][data-floating] .fd-header-actions,[data-form-devtools][data-floating] .fd-header-actions *{cursor:pointer;user-select:auto}' +
  '[data-form-devtools] .fd-resize{position:absolute;right:2px;bottom:2px;width:14px;height:14px;padding:0;border:0;border-radius:3px 0 12px 0;background:linear-gradient(135deg,transparent 55%,color-mix(in srgb,var(--fd-accent) 70%,var(--fd-border)) 55%);cursor:nwse-resize;appearance:none}' +
  '[data-form-devtools] .fd-resize:focus-visible{outline:2px solid var(--fd-accent);outline-offset:1px}'

function JsonValue({ value, root = false }: { value: unknown; root?: boolean }): ReactNode {
  if (value === null || value === undefined) {
    return <span className="fd-null">{String(value)}</span>
  }
  if (typeof value === 'string') {
    return <span className="fd-string">&quot;{value}&quot;</span>
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return <span className="fd-number">{String(value)}</span>
  }
  if (typeof value === 'boolean') {
    return <span className="fd-boolean">{String(value)}</span>
  }
  if (Array.isArray(value)) {
    const list = value as unknown[]
    if (list.length === 0) return <span className="fd-punct">[]</span>
    return (
      <ul className={`fd-tree${root ? ' fd-tree-root' : ''}`}>
        {list.map((item, index) => (
          <li key={index} className="fd-row-block">
            <span className="fd-punct">[{index}]</span> <JsonValue value={item} />
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const tag = record.$dev
    if (typeof tag === 'string') {
      if (tag === 'redacted') {
        return <span className="fd-badge fd-badge-redacted">redacted</span>
      }
      if (tag === 'File' || tag === 'Blob') {
        const name = typeof record.name === 'string' ? record.name : undefined
        const type = typeof record.type === 'string' ? record.type : undefined
        const size = typeof record.size === 'number' ? record.size : undefined
        return (
          <span className="fd-badge fd-badge-file">
            {tag}
            {name ? ` ${name}` : ''}
            {type ? ` · ${type}` : ''}
            {size != null ? ` · ${size}B` : ''}
          </span>
        )
      }
      return (
        <span className="fd-badge fd-badge-meta">
          {tag}
          {typeof record.name === 'string' ? ` ${record.name}` : ''}
        </span>
      )
    }
    const entries = Object.entries(record)
    if (entries.length === 0) return <span className="fd-punct">{'{}'}</span>
    return (
      <ul className={`fd-tree${root ? ' fd-tree-root' : ''}`}>
        {entries.map(([key, child]) => {
          const recordChild = child as Record<string, unknown> | null
          const nested =
            child !== null &&
            typeof child === 'object' &&
            !Array.isArray(child) &&
            typeof recordChild?.$dev !== 'string'
          const isArrayChild = Array.isArray(child)
          if (nested || isArrayChild) {
            return (
              <li key={key} className="fd-row-block">
                <div className="fd-key">{key}</div>
                <JsonValue value={child} />
              </li>
            )
          }
          return (
            <li key={key} className="fd-row">
              <span className="fd-key">{key}</span>
              <span className="fd-row-value">
                <JsonValue value={child} />
              </span>
            </li>
          )
        })}
      </ul>
    )
  }
  return <span className="fd-null">{typeof value}</span>
}

type IssueLike = {
  message?: unknown
  type?: unknown
  source?: unknown
}

type ErrorLike = {
  message?: unknown
  type?: unknown
  source?: unknown
  issues?: unknown
}

function readText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function MetaPills({ type, source }: { type?: string; source?: string }) {
  if (!type && !source) return null
  return (
    <div className="fd-card-meta">
      {source ? <span className="fd-pill">{source}</span> : null}
      {type ? <span className="fd-pill">{type}</span> : null}
    </div>
  )
}

function ErrorDetailCard({ path, error }: { path: string; error: ErrorLike }) {
  const message = readText(error.message) ?? 'Invalid'
  const type = readText(error.type)
  const source = readText(error.source)
  const issues = Array.isArray(error.issues) ? (error.issues as IssueLike[]) : []
  const showIssueList =
    issues.length > 1 || (issues.length === 1 && readText(issues[0]?.message) !== message)

  return (
    <article className="fd-card">
      <div className="fd-card-head">
        <h4 className="fd-card-path">{path}</h4>
        <MetaPills type={type} source={source} />
      </div>
      <p className="fd-card-msg">{message}</p>
      {showIssueList ? (
        <ul className="fd-issues">
          {issues.map((issue, index) => {
            const issueMessage = readText(issue.message) ?? 'Invalid'
            return (
              <li key={`${path}-${index}-${issueMessage}`} className="fd-issue">
                <p className="fd-issue-label">Issue {index + 1}</p>
                <p className="fd-issue-msg">{issueMessage}</p>
                <MetaPills type={readText(issue.type)} source={readText(issue.source)} />
              </li>
            )
          })}
        </ul>
      ) : null}
    </article>
  )
}

function ErrorsMessagesPanel({
  errors,
  rootError,
}: {
  errors: unknown
  rootError: string | undefined
}) {
  const entries =
    errors && typeof errors === 'object'
      ? Object.entries(errors as Record<string, unknown>).filter(
          ([, message]) => typeof message === 'string' && message.length > 0,
        )
      : []

  if (entries.length === 0 && !rootError) {
    return <p className="fd-empty">No field errors.</p>
  }

  return (
    <div className="fd-cards">
      {rootError ? (
        <article className="fd-card">
          <div className="fd-card-head">
            <h4 className="fd-card-path">root</h4>
          </div>
          <p className="fd-card-msg">{rootError}</p>
        </article>
      ) : null}
      {entries.map(([path, message]) => (
        <article key={path} className="fd-card">
          <div className="fd-card-head">
            <h4 className="fd-card-path">{path}</h4>
          </div>
          <p className="fd-card-msg">{String(message)}</p>
        </article>
      ))}
    </div>
  )
}

function ErrorDetailsPanel({
  errorDetails,
  rootErrorDetails,
}: {
  errorDetails: unknown
  rootErrorDetails: unknown
}) {
  const entries =
    errorDetails && typeof errorDetails === 'object'
      ? Object.entries(errorDetails as Record<string, unknown>).filter(
          ([, value]) => value != null && typeof value === 'object',
        )
      : []
  const root =
    rootErrorDetails && typeof rootErrorDetails === 'object'
      ? (rootErrorDetails as ErrorLike)
      : undefined

  if (entries.length === 0 && !root) {
    return <p className="fd-empty">No structured error details.</p>
  }

  return (
    <div className="fd-cards">
      {root ? <ErrorDetailCard path="root" error={root} /> : null}
      {entries.map(([path, value]) => (
        <ErrorDetailCard key={path} path={path} error={value as ErrorLike} />
      ))}
    </div>
  )
}

function StatusChip({
  tone,
  children,
}: {
  tone: 'ok' | 'warn' | 'error' | 'info' | 'muted'
  children: ReactNode
}) {
  return <span className={`fd-chip fd-chip-${tone}`}>{children}</span>
}

/**
 * Development-only read-only inspector. Import from the DevTools entry, not core.
 * Filenames can be sensitive — use `redactFiles`, `hideFileNames`, or `redact`.
 * Does not read File contents. Hostile proxies can still run traps when inspected.
 */
export function FormDevTools<T extends FormValues = FormValues>(props: FormDevToolsProps<T>) {
  const {
    control: controlProp,
    position = 'bottom-right',
    initiallyOpen = true,
    enabled = true,
    redact,
    redactFiles = false,
    hideFileNames = false,
  } = props

  const contextControl = useOptionalFormContext()
  const control = resolveControl(controlProp, contextControl, 'FormDevTools')
  const panelId = useId()
  const tablistId = useId()
  const instanceId = useId()
  const [open, setOpen] = useState(initiallyOpen)
  const [tab, setTab] = useState<PanelTab>('values')
  const [placement, setPlacement] = useState<DevToolsPosition>(position)
  const [positionProp, setPositionProp] = useState(position)
  const [floatFrame, setFloatFrame] = useState<FloatFrame | null>(() => {
    if (position === 'inline' || typeof window === 'undefined') return null
    return defaultFloatFrame(defaultFloatCorner(position), takeOpenStagger(instanceId))
  })
  const [collapsedSlot, setCollapsedSlot] = useState<number | null>(() =>
    position !== 'inline' && !initiallyOpen ? takeCollapsedSlot(instanceId) : null,
  )
  const [stackZ, setStackZ] = useState(() => nextFloatZIndex())
  const [dragging, setDragging] = useState(false)
  const dragOffsetRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(
    null,
  )
  const resizeSessionRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    width: number
    height: number
  } | null>(null)

  if (position !== positionProp) {
    setPositionProp(position)
    setPlacement(position)
    releaseFloatInstance(instanceId)
    if (position === 'inline' || typeof window === 'undefined') {
      setFloatFrame(null)
      setCollapsedSlot(null)
    } else {
      setFloatFrame(defaultFloatFrame(defaultFloatCorner(position), takeOpenStagger(instanceId)))
      setCollapsedSlot(open ? null : takeCollapsedSlot(instanceId))
    }
  }

  const floatCorner = defaultFloatCorner(position)
  const floating = placement !== 'inline'

  if (floating && floatFrame == null && open && typeof window !== 'undefined') {
    setFloatFrame(defaultFloatFrame(floatCorner, takeOpenStagger(instanceId)))
  }

  useEffect(() => {
    return () => {
      releaseFloatInstance(instanceId)
    }
  }, [instanceId])

  const bringToFront = useCallback(() => {
    setStackZ(nextFloatZIndex())
  }, [])

  const snapshot = useFormState<T, InspectorSnapshot<T>>({
    control,
    selector: (state) => ({
      values: state.values,
      defaultValues: state.defaultValues,
      errors: state.errors,
      errorDetails: state.errorDetails,
      rootError: state.rootError,
      rootErrorDetails: state.rootErrorDetails,
      touched: state.touched,
      isDirty: state.isDirty,
      isValid: state.isValid,
      isSubmitting: state.isSubmitting,
      isValidating: state.isValidating,
      submitCount: state.submitCount,
      isLoadingDefaults: state.isLoadingDefaults,
      isDefaultsReady: state.isDefaultsReady,
      defaultValuesError: state.defaultValuesError?.message,
    }),
    isEqual: snapshotsEqual,
  })

  const serializeOptions = useMemo<SafeSerializeOptions>(() => {
    if (typeof redact === 'function') {
      return { redact, redactFiles, hideFileNames }
    }
    return { redactPaths: redact, redactFiles, hideFileNames }
  }, [hideFileNames, redact, redactFiles])

  const fieldErrorCount = countMappedKeys(snapshot.errors)
  const errorCount = fieldErrorCount + (snapshot.rootError ? 1 : 0)

  const treePayload = useMemo(() => {
    if (!open) return null
    if (tab === 'values') return safeSerialize(snapshot.values, serializeOptions)
    if (tab === 'defaults') return safeSerialize(snapshot.defaultValues, serializeOptions)
    if (tab === 'state') {
      // Touched/dirty maps use field paths as keys; do not redact boolean metadata
      // just because a path segment is named `password`.
      return safeSerialize(
        omitUndefinedEntries({
          touched: snapshot.touched,
          dirtyFields: computeDirtyFields(snapshot.values, snapshot.defaultValues),
          isDirty: snapshot.isDirty,
          isValid: snapshot.isValid,
          isSubmitting: snapshot.isSubmitting,
          isValidating: snapshot.isValidating,
          submitCount: snapshot.submitCount,
          isLoadingDefaults: snapshot.isLoadingDefaults,
          isDefaultsReady: snapshot.isDefaultsReady,
          defaultValuesError: snapshot.defaultValuesError,
        }),
        { redactSensitiveKeys: false, hideFileNames },
      )
    }
    return null
  }, [hideFileNames, open, serializeOptions, snapshot, tab])

  const toggle = useCallback(() => {
    bringToFront()
    if (floating) {
      if (open) {
        setCollapsedSlot(takeCollapsedSlot(instanceId))
      } else {
        releaseCollapsedSlot(instanceId)
        setCollapsedSlot(null)
        setFloatFrame(
          (frame) => frame ?? defaultFloatFrame(floatCorner, takeOpenStagger(instanceId)),
        )
      }
    }
    setOpen((current) => !current)
  }, [bringToFront, floatCorner, floating, instanceId, open])

  const togglePlacement = useCallback(() => {
    bringToFront()
    if (placement === 'inline') {
      const stagger = takeOpenStagger(instanceId)
      setFloatFrame((frame) => frame ?? defaultFloatFrame(floatCorner, stagger))
      if (!open) {
        setCollapsedSlot(takeCollapsedSlot(instanceId))
      }
      setPlacement(floatCorner)
      return
    }
    releaseFloatInstance(instanceId)
    setFloatFrame(null)
    setCollapsedSlot(null)
    setPlacement('inline')
  }, [bringToFront, floatCorner, instanceId, open, placement])

  const onDragPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!floating || floatFrame == null) return
      if (event.button > 0) return
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('button, a, input, textarea, select, [role="tab"]')
      ) {
        return
      }
      event.preventDefault()
      bringToFront()
      dragOffsetRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - floatFrame.x,
        offsetY: event.clientY - floatFrame.y,
      }
      setDragging(true)
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    [bringToFront, floatFrame, floating],
  )

  const onDragPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragOffsetRef.current
    if (!session) return
    setFloatFrame((current) => {
      if (!current) return current
      return clampFloatFrame({
        ...current,
        x: event.clientX - session.offsetX,
        y: event.clientY - session.offsetY,
      })
    })
  }, [])

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragOffsetRef.current) return
    dragOffsetRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
  }, [])

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!floating || floatFrame == null) return
      if (event.button > 0) return
      event.preventDefault()
      event.stopPropagation()
      bringToFront()
      resizeSessionRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: floatFrame.width,
        height: floatFrame.height,
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    [bringToFront, floatFrame, floating],
  )

  const onResizePointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = resizeSessionRef.current
    if (!session) return
    setFloatFrame((current) => {
      if (!current) return current
      return clampFloatFrame({
        ...current,
        width: session.width + (event.clientX - session.startX),
        height: session.height + (event.clientY - session.startY),
      })
    })
  }, [])

  const endResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizeSessionRef.current) return
    resizeSessionRef.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
  }, [])

  const panelContent = (() => {
    if (tab === 'errors') {
      return <ErrorsMessagesPanel errors={snapshot.errors} rootError={snapshot.rootError} />
    }
    if (tab === 'details') {
      return (
        <ErrorDetailsPanel
          errorDetails={snapshot.errorDetails}
          rootErrorDetails={snapshot.rootErrorDetails}
        />
      )
    }
    if (isEmptyPayload(treePayload)) {
      return <p className="fd-empty">Nothing to show in this section.</p>
    }
    return <JsonValue value={treePayload} root />
  })()

  if (!enabled) return null

  const panel = (
    <aside
      data-form-devtools=""
      data-position={placement}
      data-floating={floating ? '' : undefined}
      style={panelStyle({
        position: placement,
        open,
        frame: floatFrame,
        zIndex: stackZ,
        collapsedSlot,
      })}
      aria-label="Form DevTools"
      onPointerDownCapture={floating ? bringToFront : undefined}
    >
      <style>{STYLES}</style>
      {!open ? (
        <button
          type="button"
          className="fd-collapsed"
          aria-label="Expand"
          aria-expanded={false}
          aria-controls={panelId}
          onClick={toggle}
        >
          <span className="fd-mark" aria-hidden="true" />
          <span aria-hidden="true">Form DevTools</span>
          {errorCount > 0 ? (
            <span className="fd-chip fd-chip-error" aria-hidden="true">
              {errorCount} issue{errorCount === 1 ? '' : 's'}
            </span>
          ) : snapshot.isValid ? (
            <span className="fd-chip fd-chip-ok" aria-hidden="true">
              valid
            </span>
          ) : (
            <span className="fd-chip fd-chip-muted" aria-hidden="true">
              idle
            </span>
          )}
        </button>
      ) : (
        <div className="fd-shell" id={panelId}>
          <div
            className={dragging ? 'fd-header is-dragging' : 'fd-header'}
            onPointerDown={floating ? onDragPointerDown : undefined}
            onPointerMove={floating ? onDragPointerMove : undefined}
            onPointerUp={floating ? endDrag : undefined}
            onPointerCancel={floating ? endDrag : undefined}
          >
            <div className="fd-brand">
              <span className="fd-mark" aria-hidden="true" />
              <div>
                <p className="fd-title">Form DevTools</p>
                <p className="fd-subtitle">
                  {floating ? 'Drag header · resize corner' : 'Read-only inspector'}
                </p>
              </div>
            </div>
            <div className="fd-header-actions">
              <button
                type="button"
                className="fd-icon-btn"
                aria-label={floating ? 'Dock inline' : 'Float over page'}
                aria-pressed={floating}
                onClick={togglePlacement}
              >
                {floating ? 'Dock' : 'Float'}
              </button>
              <button
                type="button"
                className="fd-icon-btn"
                aria-label="Collapse"
                aria-expanded={true}
                aria-controls={panelId}
                onClick={toggle}
              >
                Collapse
              </button>
            </div>
          </div>

          <div className="fd-body">
            <div className="fd-status" aria-label="Form status">
              <StatusChip tone={snapshot.isValid ? 'ok' : 'error'}>
                {snapshot.isValid ? 'Valid' : 'Invalid'}
              </StatusChip>
              <StatusChip tone={snapshot.isDirty ? 'warn' : 'muted'}>
                {snapshot.isDirty ? 'Dirty' : 'Pristine'}
              </StatusChip>
              {errorCount > 0 ? (
                <StatusChip tone="error">
                  {errorCount} error{errorCount === 1 ? '' : 's'}
                </StatusChip>
              ) : null}
              {snapshot.isSubmitting ? <StatusChip tone="info">Submitting</StatusChip> : null}
              {snapshot.isValidating ? <StatusChip tone="info">Validating</StatusChip> : null}
              {snapshot.isLoadingDefaults ? (
                <StatusChip tone="info">Loading defaults</StatusChip>
              ) : null}
              <StatusChip tone="muted">Submit ×{snapshot.submitCount}</StatusChip>
            </div>

            <div className="fd-tabs" role="tablist" aria-label="Inspector sections" id={tablistId}>
              {TABS.map((item) => {
                const selected = tab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="fd-tab"
                    role="tab"
                    id={`${tablistId}-${item.id}`}
                    aria-selected={selected}
                    aria-controls={`${panelId}-${item.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setTab(item.id)}
                  >
                    {item.label}
                    {item.id === 'errors' && errorCount > 0 ? ` (${errorCount})` : ''}
                  </button>
                )
              })}
            </div>

            <div
              className="fd-panel"
              role="tabpanel"
              id={`${panelId}-${tab}`}
              aria-labelledby={`${tablistId}-${tab}`}
            >
              {panelContent}
            </div>
          </div>

          {floating ? (
            <button
              type="button"
              className="fd-resize"
              aria-label="Resize DevTools"
              onPointerDown={onResizePointerDown}
              onPointerMove={onResizePointerMove}
              onPointerUp={endResize}
              onPointerCancel={endResize}
            />
          ) : null}
        </div>
      )}
    </aside>
  )

  if (floating && typeof document !== 'undefined') {
    return createPortal(panel, document.body)
  }

  return panel
}
