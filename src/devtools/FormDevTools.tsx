import { useCallback, useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useFormState, type FormControl, type FormValues } from '../hooks/useForm/index.ts'
import { resolveControl, useOptionalFormContext } from '../hooks/useForm/formContext.ts'
import { computeDirtyFields } from '../hooks/useForm/utilities.ts'
import {
  formatSerialized,
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

function panelStyle(position: DevToolsPosition, open: boolean): CSSProperties {
  if (position === 'inline') {
    return {
      position: 'relative',
      marginTop: '0.75rem',
      maxWidth: '100%',
    }
  }
  return {
    position: 'fixed',
    zIndex: 99999,
    bottom: 12,
    [position === 'bottom-left' ? 'left' : 'right']: 12,
    width: open ? 360 : 'auto',
    maxWidth: 'calc(100vw - 24px)',
    maxHeight: open ? 'min(70vh, 640px)' : undefined,
  }
}

const shellStyle: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 12,
  color: '#e2e8f0',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 8,
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.35)',
  overflow: 'hidden',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '8px 10px',
  background: '#1e293b',
}

const buttonStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid #64748b',
  background: '#0f172a',
  color: '#f8fafc',
  borderRadius: 4,
  padding: '4px 8px',
  cursor: 'pointer',
  font: 'inherit',
}

const sectionStyle: CSSProperties = {
  borderTop: '1px solid #334155',
}

const preStyle: CSSProperties = {
  margin: 0,
  padding: '8px 10px',
  overflow: 'auto',
  maxHeight: 180,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  regionId,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  regionId: string
}) {
  return (
    <section style={sectionStyle}>
      <h3 style={{ margin: 0 }}>
        <button
          type="button"
          style={{
            ...buttonStyle,
            width: '100%',
            textAlign: 'left',
            border: 'none',
            borderRadius: 0,
            padding: '8px 10px',
            background: 'transparent',
          }}
          aria-expanded={open}
          aria-controls={regionId}
          onClick={onToggle}
        >
          {open ? '▼' : '▶'} {title}
        </button>
      </h3>
      {open ? (
        <div id={regionId} role="region" aria-label={title}>
          {children}
        </div>
      ) : null}
    </section>
  )
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
  const [open, setOpen] = useState(initiallyOpen)
  const [openSections, setOpenSections] = useState({
    values: true,
    defaults: false,
    errors: true,
    details: false,
    state: true,
  })

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

  const toggle = useCallback(() => {
    setOpen((current) => !current)
  }, [])

  const toggleSection = useCallback((key: keyof typeof openSections) => {
    setOpenSections((current) => ({ ...current, [key]: !current[key] }))
  }, [])

  if (!enabled) return null

  return (
    <aside
      data-form-devtools=""
      data-position={position}
      style={panelStyle(position, open)}
      aria-label="Form DevTools"
    >
      <div style={shellStyle}>
        <div style={headerStyle}>
          <strong>Form DevTools</strong>
          <button
            type="button"
            style={buttonStyle}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={toggle}
          >
            {open ? 'Collapse' : 'Expand'}
          </button>
        </div>
        {open ? (
          <div id={panelId} style={{ overflow: 'auto', maxHeight: 'min(62vh, 580px)' }}>
            <CollapsibleSection
              title="Values"
              open={openSections.values}
              onToggle={() => toggleSection('values')}
              regionId={`${panelId}-values`}
            >
              <pre style={preStyle}>
                {formatSerialized(safeSerialize(snapshot.values, serializeOptions))}
              </pre>
            </CollapsibleSection>
            <CollapsibleSection
              title="Default values"
              open={openSections.defaults}
              onToggle={() => toggleSection('defaults')}
              regionId={`${panelId}-defaults`}
            >
              <pre style={preStyle}>
                {formatSerialized(safeSerialize(snapshot.defaultValues, serializeOptions))}
              </pre>
            </CollapsibleSection>
            <CollapsibleSection
              title="Errors"
              open={openSections.errors}
              onToggle={() => toggleSection('errors')}
              regionId={`${panelId}-errors`}
            >
              <pre style={preStyle}>
                {formatSerialized(
                  safeSerialize(
                    {
                      errors: snapshot.errors,
                      rootError: snapshot.rootError,
                    },
                    serializeOptions,
                  ),
                )}
              </pre>
            </CollapsibleSection>
            <CollapsibleSection
              title="Structured error details"
              open={openSections.details}
              onToggle={() => toggleSection('details')}
              regionId={`${panelId}-details`}
            >
              <pre style={preStyle}>
                {formatSerialized(
                  safeSerialize(
                    {
                      errorDetails: snapshot.errorDetails,
                      rootErrorDetails: snapshot.rootErrorDetails,
                    },
                    serializeOptions,
                  ),
                )}
              </pre>
            </CollapsibleSection>
            <CollapsibleSection
              title="Form state"
              open={openSections.state}
              onToggle={() => toggleSection('state')}
              regionId={`${panelId}-state`}
            >
              <pre style={preStyle}>
                {formatSerialized(
                  safeSerialize(
                    {
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
                    },
                    serializeOptions,
                  ),
                )}
              </pre>
            </CollapsibleSection>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
