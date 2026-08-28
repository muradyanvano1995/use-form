import { useId, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { FormControl, FormValues } from '../hooks/useForm'
import { resolveControl, useOptionalFormContext } from '../hooks/useForm/formContext.ts'
import { ErrorDetailsPanel, ErrorsMessagesPanel } from './components/ErrorPanel.tsx'
import { JsonValue } from './components/JsonTree.tsx'
import { DevToolsPanel } from './components/DevToolsPanel.tsx'
import { ResizeHandle } from './components/ResizeHandles.tsx'
import { computeDevToolsDirtyFields } from './dirtyFields.ts'
import { useDevToolsSnapshot } from './hooks/useDevToolsSnapshot.ts'
import { useFloatingPanel } from './hooks/useFloatingPanel.ts'
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

type PanelTab = 'values' | 'errors' | 'details' | 'state' | 'defaults'

const TABS: ReadonlyArray<{ id: PanelTab; label: string }> = [
  { id: 'values', label: 'Values' },
  { id: 'errors', label: 'Errors' },
  { id: 'details', label: 'Details' },
  { id: 'state', label: 'State' },
  { id: 'defaults', label: 'Defaults' },
]

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

function omitUndefinedEntries(value: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (child !== undefined) next[key] = child
  }
  return next
}

function hasFieldErrorMessages(errors: unknown): boolean {
  if (errors == null || typeof errors !== 'object') return false
  for (const message of Object.values(errors as Record<string, unknown>)) {
    if (typeof message === 'string' && message.length > 0) return true
  }
  return false
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
  const [tab, setTab] = useState<PanelTab>('values')
  const {
    open,
    placement,
    floating,
    dragging,
    style,
    bringToFront,
    toggle,
    togglePlacement,
    onDragPointerDown,
    onDragPointerMove,
    endDrag,
    onResizePointerDown,
    onResizePointerMove,
    endResize,
  } = useFloatingPanel({ instanceId, position, initiallyOpen })

  const snapshot = useDevToolsSnapshot(control)

  const serializeOptions = useMemo<SafeSerializeOptions>(() => {
    if (typeof redact === 'function') {
      return { redact, redactFiles, hideFileNames }
    }
    return { redactPaths: redact, redactFiles, hideFileNames }
  }, [hideFileNames, redact, redactFiles])

  const dirtyFields = useMemo(
    () => computeDevToolsDirtyFields(snapshot.values, snapshot.defaultValues),
    [snapshot.defaultValues, snapshot.values],
  )
  const isDirty = countMappedKeys(dirtyFields) > 0
  const isValid = !hasFieldErrorMessages(snapshot.errors) && !snapshot.rootError
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
          dirtyFields,
          isDirty,
          isValid,
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
  }, [dirtyFields, hideFileNames, isDirty, isValid, open, serializeOptions, snapshot, tab])

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
      return <p className="fd-empty">Empty</p>
    }
    return <JsonValue value={treePayload} root />
  })()

  if (!enabled) return null

  const panel = (
    <DevToolsPanel
      placement={placement}
      floating={floating}
      style={style}
      onActivate={floating ? bringToFront : undefined}
    >
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
          ) : isValid ? (
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
                <p className="fd-subtitle">{floating ? 'Drag · resize' : 'Read-only'}</p>
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
              <StatusChip tone={isValid ? 'ok' : 'error'}>
                {isValid ? 'Valid' : 'Invalid'}
              </StatusChip>
              <StatusChip tone={isDirty ? 'warn' : 'muted'}>
                {isDirty ? 'Dirty' : 'Pristine'}
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
            <ResizeHandle
              onPointerDown={onResizePointerDown}
              onPointerMove={onResizePointerMove}
              onPointerUp={endResize}
              onPointerCancel={endResize}
            />
          ) : null}
        </div>
      )}
    </DevToolsPanel>
  )

  if (floating && typeof document !== 'undefined') {
    return createPortal(panel, document.body)
  }

  return panel
}
