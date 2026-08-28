import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const PACKAGE_NAME = '@muradyanvano/use-form'
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

export function nodeModulesPackageRoot(consumerDir, name = packageJson.name) {
  if (name.startsWith('@')) {
    const slash = name.indexOf('/')
    assert(slash > 1, `Invalid scoped package name: ${name}`)
    return path.join(consumerDir, 'node_modules', name.slice(0, slash), name.slice(slash + 1))
  }
  return path.join(consumerDir, 'node_modules', name)
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

export function packTarball(tmpRoot) {
  const output = execSync('npm pack --json', { cwd: rootDir, encoding: 'utf8' })
  const entries = JSON.parse(output)
  assert(Array.isArray(entries) && entries.length > 0, 'npm pack --json returned no entries')
  const filename = entries[0]?.filename
  assert(
    typeof filename === 'string' && filename.endsWith('.tgz'),
    'npm pack --json missing filename',
  )
  const sourcePath = path.join(rootDir, filename)
  assert(existsSync(sourcePath), `Packed tarball missing on disk: ${filename}`)
  const destPath = path.join(tmpRoot, filename)
  cpSync(sourcePath, destPath)
  rmSync(sourcePath, { force: true })
  return { tarballPath: destPath, filename, packEntry: entries[0] }
}
