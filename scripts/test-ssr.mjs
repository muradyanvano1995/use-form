import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { CORE_FORBIDDEN_EXPORTS, CORE_RUNTIME_EXPORTS, assert, distDir } from './package-utils.mjs'

assert(
  existsSync(path.join(distDir, 'lib/index.js')),
  'dist/lib/index.js is missing. Run npm run build:lib first.',
)

const coreUrl = pathToFileURL(path.join(distDir, 'lib/index.js')).href
const devtoolsUrl = pathToFileURL(path.join(distDir, 'devtools/index.js')).href
const resolverUrl = pathToFileURL(path.join(distDir, 'resolvers/standard-schema/index.js')).href

const core = await import(coreUrl)
for (const name of CORE_RUNTIME_EXPORTS) {
  assert(name in core, `Core is missing ${name}`)
}
for (const name of CORE_FORBIDDEN_EXPORTS) {
  assert(!(name in core), `Core unexpectedly exports ${name}`)
}

let loaderCalls = 0
function Form() {
  const form = core.useForm({
    defaultValues: { email: 'ssr@example.com' },
    loadDefaultValues: async () => {
      loaderCalls += 1
      return { email: 'loaded@example.com' }
    },
  })
  return createElement('input', { defaultValue: form.values.email, readOnly: true })
}

const html = renderToString(createElement(Form))
assert(html.includes('ssr@example.com'), `SSR did not render fallback defaults: ${html}`)
assert(loaderCalls === 0, 'Async default loader ran during SSR')

await import(devtoolsUrl)
await import(resolverUrl)

const resolverSource = readFileSync(
  path.join(distDir, 'resolvers/standard-schema/index.js'),
  'utf8',
)
assert(!resolverSource.includes("from 'react'"), 'Resolver entry should not import React')

console.log('SSR import and render checks passed')
