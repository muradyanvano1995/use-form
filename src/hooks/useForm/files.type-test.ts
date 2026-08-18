/**
 * Compile-time type tests for file field registration and values.
 * Checked by `tsc` / `npm run typecheck` (not executed by Vitest).
 */
import { rules, type FieldRules, type UseFormOptions, type UseFormReturn } from './index.ts'

type ProfileFileForm = {
  name: string
  avatar: File | null
  documents: File[]
  profile: {
    avatar: File | null
  }
}

declare const form: UseFormReturn<ProfileFileForm>
declare const file: File

form.setValue('avatar', file)
form.setValue('avatar', null)
form.setValue('documents', [file])
form.setValue('profile.avatar', file)
form.setValue('profile.avatar', null)

form.register('avatar', { type: 'file' })
form.register('documents', { type: 'file', multiple: true })
form.register('profile.avatar', { type: 'file', accept: 'image/png' })

// @ts-expect-error — string path is not a file
form.setValue('avatar', 'avatar.png')

// @ts-expect-error — single File is not File[]
form.setValue('documents', file)

// @ts-expect-error — File is not assignable to string name
form.setValue('name', file)

// @ts-expect-error — string field cannot register as file
form.register('name', { type: 'file' })

// @ts-expect-error — single file field cannot set multiple: true
form.register('avatar', { type: 'file', multiple: true })

// @ts-expect-error — File[] field requires multiple: true
form.register('documents', { type: 'file' })

const _rules: FieldRules<ProfileFileForm> = {
  avatar: [
    rules.required('Select an avatar'),
    rules.fileSize(1024),
    (value, values) => {
      const _file: File | null = value
      const _values: Readonly<ProfileFileForm> = values
      void _file
      void _values
      return undefined
    },
  ],
  documents: [rules.minFiles(1), rules.maxFiles(5), rules.fileExtension(['pdf'])],
}

const _options: UseFormOptions<ProfileFileForm> = {
  defaultValues: {
    name: '',
    avatar: null,
    documents: [],
    profile: { avatar: null },
  },
  rules: _rules,
}

void _options

export {}
