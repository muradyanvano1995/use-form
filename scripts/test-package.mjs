import { execFileSync, execSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  CORE_FORBIDDEN_EXPORTS,
  CORE_RUNTIME_EXPORTS,
  DEVTOOLS_RUNTIME_EXPORTS,
  FORBIDDEN_PACK_PATHS,
  RESOLVER_RUNTIME_EXPORTS,
  assert,
  distDir,
  packageJson,
  rootDir,
} from './package-utils.mjs'

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'inherit' })
}

function runNpm(args, cwd) {
  execSync(`npm ${args.join(' ')}`, { cwd, stdio: 'inherit', shell: true })
}

function readTarList(tarballPath) {
  const output = execFileSync('tar', ['-tf', tarballPath], { encoding: 'utf8' })
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^package\//, ''))
}

function assertDistBuilt() {
  assert(
    existsSync(path.join(distDir, 'lib/index.js')),
    'dist/lib/index.js is missing. Run npm run build:lib first.',
  )
  assert(
    existsSync(path.join(distDir, 'devtools/index.js')),
    'dist/devtools/index.js is missing. Run npm run build:lib first.',
  )
  assert(
    existsSync(path.join(distDir, 'resolvers/standard-schema/index.js')),
    'dist/resolvers/standard-schema/index.js is missing. Run npm run build:lib first.',
  )
}

function writeConsumer(consumerDir) {
  mkdirSync(path.join(consumerDir, 'src'), { recursive: true })
  writeFileSync(
    path.join(consumerDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'form-package-consumer',
        private: true,
        type: 'module',
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    path.join(consumerDir, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          jsx: 'react-jsx',
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          types: ['react', 'react-dom'],
        },
        include: ['src'],
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    path.join(consumerDir, 'src/core.ts'),
    `import {
  rules,
  useForm,
  useFieldArray,
  type FieldPath,
  type FormResolver,
} from '${packageJson.name}'

type Profile = {
  email: string
  profile: { city: string }
  products: Array<{ name: string }>
}

export function createForm() {
  const form = useForm<Profile>({
    defaultValues: {
      email: '',
      profile: { city: '' },
      products: [{ name: '' }],
    },
    rules: {
      email: [rules.required(), rules.email()],
    },
  })
  const city: string = form.getValue('profile.city')
  const emailPath: FieldPath<Profile> = 'email'
  void city
  void emailPath
  return form
}

export const resolver: FormResolver<Profile> = async (values) => ({
  success: true,
  values,
})
`,
  )
  writeFileSync(
    path.join(consumerDir, 'src/devtools.ts'),
    `import { FormDevTools, type FormDevToolsProps } from '${packageJson.name}/devtools'

export const props: FormDevToolsProps = { enabled: false }
void FormDevTools
`,
  )
  writeFileSync(
    path.join(consumerDir, 'src/resolver.ts'),
    `import { standardSchemaResolver, type StandardSchemaV1 } from '${packageJson.name}/resolvers/standard-schema'

type Input = { age: string }
type Output = { age: number }

const schema: StandardSchemaV1<Input, Output> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value) => ({ value: { age: Number((value as Input).age) } }),
  },
}

export const resolver = standardSchemaResolver<Input, Output>(schema)
`,
  )
  writeFileSync(
    path.join(consumerDir, 'src/jsx.tsx'),
    `import { FormProvider, useForm } from '${packageJson.name}'

export function Demo() {
  const form = useForm({ defaultValues: { email: '' } })
  return (
    <FormProvider control={form.control}>
      <input {...form.register('email')} />
    </FormProvider>
  )
}
`,
  )
}

async function assertConsumerRuntime(consumerDir) {
  const packedRoot = path.join(consumerDir, 'node_modules', packageJson.name)
  const core = await import(pathToFileURL(path.join(packedRoot, 'dist/lib/index.js')).href)
  for (const name of CORE_RUNTIME_EXPORTS) {
    assert(name in core, `Packed core is missing runtime export ${name}`)
  }
  for (const name of CORE_FORBIDDEN_EXPORTS) {
    assert(!(name in core), `Packed core unexpectedly exports ${name}`)
  }

  const devtools = await import(pathToFileURL(path.join(packedRoot, 'dist/devtools/index.js')).href)
  for (const name of DEVTOOLS_RUNTIME_EXPORTS) {
    assert(name in devtools, `Packed DevTools is missing ${name}`)
  }

  const resolver = await import(
    pathToFileURL(path.join(packedRoot, 'dist/resolvers/standard-schema/index.js')).href
  )
  for (const name of RESOLVER_RUNTIME_EXPORTS) {
    assert(name in resolver, `Packed resolver is missing ${name}`)
  }

  try {
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `await import('${packageJson.name}/hooks/useForm/formStore.js')`,
      ],
      { cwd: consumerDir, stdio: 'pipe' },
    )
    throw new Error('Private subpath import should have failed')
  } catch (error) {
    const message = error instanceof Error ? error.message + (error.stderr ?? '') : String(error)
    assert(
      /ERR_PACKAGE_PATH_NOT_EXPORTED|Cannot find package/.test(
        String(message) + String(error.stderr ?? ''),
      ),
      `Expected exports to block private subpaths, received: ${message}`,
    )
  }
}

function extractPackedInstall(consumerDir, tarballPath) {
  const packedRoot = path.join(consumerDir, 'node_modules', packageJson.name)
  mkdirSync(packedRoot, { recursive: true })
  execSync(`tar -xf "${tarballPath}" -C "${packedRoot}" --strip-components=1`, { shell: true })
  for (const dep of ['react', 'react-dom', '@types/react', '@types/react-dom', 'typescript']) {
    cpSync(path.join(rootDir, 'node_modules', dep), path.join(consumerDir, 'node_modules', dep), {
      recursive: true,
    })
  }
}

function assertArchive(files) {
  const joined = files.join('\n')
  assert(
    files.some((file) => file === 'dist/lib/index.js' || file.endsWith('dist/lib/index.js')),
    'Archive missing core JS',
  )
  assert(
    files.some((file) => file.includes('dist/lib/index.d.ts')),
    'Archive missing core types',
  )
  assert(
    files.some((file) => file.includes('dist/devtools/index.js')),
    'Archive missing DevTools',
  )
  assert(
    files.some((file) => file.includes('dist/resolvers/standard-schema/index.js')),
    'Archive missing resolver',
  )
  assert(
    files.includes('README.md') || files.some((file) => file.endsWith('README.md')),
    'Archive missing README',
  )
  assert(
    files.includes('CHANGELOG.md') || files.some((file) => file.endsWith('CHANGELOG.md')),
    'Archive missing CHANGELOG',
  )
  assert(
    !files.some((file) => file === 'LICENSE' || file.endsWith('/LICENSE')),
    'Archive must not invent a LICENSE',
  )
  for (const forbidden of FORBIDDEN_PACK_PATHS) {
    assert(
      !files.some((file) => file === forbidden || file.startsWith(forbidden)),
      `Archive unexpectedly contains ${forbidden}`,
    )
  }
  assert(!joined.includes('.env'), 'Archive contains an environment file')
  assert(!files.some((file) => file.includes('.test.')), 'Archive contains tests')
  assert(!files.some((file) => file.includes('coverage')), 'Archive contains coverage')
  assert(
    !files.some((file) => file.includes('storybook-static')),
    'Archive contains Storybook output',
  )
  assert(
    !files.some((file) => file.endsWith('.svg') || file.includes('favicon')),
    'Archive contains demo assets',
  )
}

assertDistBuilt()

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'form-pack-'))
try {
  runNpm(['pack', `--pack-destination=${tmpRoot}`], rootDir)
  const packed = readdirSync(tmpRoot).find((name) => name.endsWith('.tgz'))
  assert(packed, 'npm pack did not produce a tarball')
  const tarballPath = path.join(tmpRoot, packed)
  const files = readTarList(tarballPath)
  assertArchive(files)

  const consumerDir = path.join(tmpRoot, 'consumer')
  writeConsumer(consumerDir)
  extractPackedInstall(consumerDir, tarballPath)
  run(
    process.execPath,
    [
      path.join(consumerDir, 'node_modules/typescript/lib/tsc.js'),
      '-p',
      'tsconfig.json',
      '--pretty',
      'false',
    ],
    consumerDir,
  )

  const packedRoot = path.join(consumerDir, 'node_modules', packageJson.name)
  const resolvedCore = path.join(packedRoot, 'dist/lib/index.js')
  assert(existsSync(resolvedCore), 'Packed core entry is missing after extract')
  assert(
    resolvedCore.includes(`${path.sep}node_modules${path.sep}${packageJson.name}`),
    'Consumer resolved core outside the packed install',
  )
  assert(
    !resolvedCore.includes(`${path.sep}src${path.sep}`),
    'Consumer resolved source instead of dist',
  )

  await assertConsumerRuntime(consumerDir)
  console.log('package archive and isolated consumer checks passed')
} finally {
  rmSync(tmpRoot, { recursive: true, force: true })
}
