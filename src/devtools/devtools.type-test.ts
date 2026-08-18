/**
 * Compile-time type tests for the DevTools entry.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import {
  FormDevTools,
  type DevToolsPosition,
  type DevToolsRedactionPredicate,
  type FormDevToolsProps,
} from './index.ts'
import type { FormControl } from '../hooks/useForm/index.ts'
// @ts-expect-error — serializer internals are not a public DevTools export
import { safeSerialize as _safeSerialize } from './index.ts'
// @ts-expect-error — control internals are not exported from DevTools
import { getControlInternals as _internals } from './index.ts'

type Sample = { password: string; ssn: string }

declare const control: FormControl<Sample>

const position: DevToolsPosition = 'bottom-right'
const redact: DevToolsRedactionPredicate = (path, key) => path === 'ssn' || key === 'ssn'
const props: FormDevToolsProps<Sample> = {
  control,
  position,
  initiallyOpen: false,
  enabled: true,
  redact: ['ssn'],
  redactFiles: true,
}

void FormDevTools
void props
void redact

const predicateProps: FormDevToolsProps<Sample> = {
  control,
  redact,
}
void predicateProps

// @ts-expect-error — invalid position
const _badPosition: DevToolsPosition = 'top'
void _badPosition
void _safeSerialize
void _internals

export {}
