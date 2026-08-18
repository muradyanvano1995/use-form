/**
 * Compile-time type tests for async default values.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import {
  useForm,
  type DefaultValuesLoader,
  type DefaultValuesLoadMode,
  type ReloadDefaultValuesOptions,
  type UseFormOptions,
} from './index.ts'

type Profile = {
  name: string
  email: string
  address: { city: string }
  tags: string[]
}

type ProfileOutput = {
  name: string
  email: string
  address: { city: string }
  tags: string[]
  normalized: true
}

const fallback: Profile = {
  name: '',
  email: '',
  address: { city: '' },
  tags: [],
}

const _loader: DefaultValuesLoader<Profile, { token: string }> = async ({
  signal,
  reason,
  context,
}) => {
  const _signal: AbortSignal | undefined = signal
  const _reason: 'initial' | 'reload' = reason
  const _token: string = context.token
  void _signal
  void _reason
  void _token
  return fallback
}

const _mode: DefaultValuesLoadMode = 'preserveDirty'
const _reload: ReloadDefaultValuesOptions = {
  mode: 'replace',
  validate: true,
}

const _options: UseFormOptions<Profile, ProfileOutput, { token: string }> = {
  defaultValues: fallback,
  loadDefaultValues: _loader,
  resolverContext: { token: 't' },
  defaultValuesLoadMode: 'preserveDirty',
  validateOnDefaultsLoad: false,
  allowSubmitWhileLoading: false,
  allowSubmitWhenDefaultsFailed: false,
  resolver: async (values) => ({
    success: true,
    values: { ...values, normalized: true },
  }),
}

const _syncOnly: UseFormOptions<Profile> = {
  defaultValues: fallback,
}

const _invalidMode: UseFormOptions<Profile> = {
  defaultValues: fallback,
  // @ts-expect-error — unsupported load mode
  defaultValuesLoadMode: 'mergeShallow',
}

const _partialLoader: UseFormOptions<Profile> = {
  defaultValues: fallback,
  // @ts-expect-error — loader must return complete Profile, not a partial
  loadDefaultValues: async (): Promise<Pick<Profile, 'name'>> => ({ name: 'x' }),
}

function _hookUsage() {
  const form = useForm<Profile>({
    defaultValues: fallback,
    loadDefaultValues: async () => fallback,
  })
  const _ready: boolean = form.isDefaultsReady
  const _loading: boolean = form.isLoadingDefaults
  const _error: Error | undefined = form.defaultValuesError
  const _values: Profile = form.values
  void form.reloadDefaultValues({ mode: 'preserveDirty' })
  void _ready
  void _loading
  void _error
  void _values
}

void _loader
void _mode
void _reload
void _options
void _syncOnly
void _invalidMode
void _partialLoader
void _hookUsage

export {}
