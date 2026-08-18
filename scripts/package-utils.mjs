import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const distDir = path.join(rootDir, 'dist')
export const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'))

export const CORE_RUNTIME_EXPORTS = [
  'CriteriaMode',
  'ErrorSource',
  'FormProvider',
  'ReValidateMode',
  'ValidationMode',
  'createAsyncRule',
  'createRule',
  'defaultValidationMessages',
  'normalizeErrors',
  'rules',
  'useController',
  'useFieldArray',
  'useFieldState',
  'useForm',
  'useFormContext',
  'useFormState',
  'useWatch',
]

export const CORE_FORBIDDEN_EXPORTS = ['FormDevTools', 'standardSchemaResolver', 'safeSerialize']

export const DEVTOOLS_RUNTIME_EXPORTS = ['FormDevTools']
export const RESOLVER_RUNTIME_EXPORTS = ['standardSchemaResolver']

export const FORBIDDEN_PACK_PATHS = [
  '.ai/',
  '.env',
  'coverage/',
  'storybook-static/',
  'api-docs/',
  'src/',
  'src/examples/',
  'src/App.tsx',
  'src/main.tsx',
  'index.html',
  '.github/',
  'package-tests/',
  'scripts/',
]

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}
