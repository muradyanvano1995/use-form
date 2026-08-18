/**
 * Local visual smoke against storybook-static.
 * Does not upload screenshots or use paid services.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'

const root = process.cwd()
const staticDir = join(root, 'storybook-static')
const outDir = join(root, 'storybook-visual')

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

const stories = [
  { id: 'introduction--overview', name: 'introduction' },
  { id: 'getting-started--email-field', name: 'getting-started-email' },
  { id: 'examples-login--default', name: 'login' },
  { id: 'examples-checkout--default', name: 'checkout' },
  { id: 'tools-devtools--inline-inspector', name: 'devtools' },
  { id: 'validation-internationalization--catalogs', name: 'i18n' },
]

const docsPages = [
  { id: 'introduction--docs', name: 'introduction-docs' },
  { id: 'getting-started--docs', name: 'getting-started-docs' },
  { id: 'validation-internationalization--docs', name: 'i18n-docs' },
  { id: 'core-concepts-registration--docs', name: 'registration-docs' },
  { id: 'tools-devtools--docs', name: 'devtools-docs' },
]

const leakedImport =
  /(\.\.\/hooks\/|\.\.\/lib\/|from ['"]storybook\/test['"]|C:\\\\www|src\/hooks\/useForm)/

function startStaticServer(port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
    let filePath = join(staticDir, decodeURIComponent(url.pathname))
    if (url.pathname === '/' || !existsSync(filePath)) {
      const iframe = join(staticDir, url.pathname.replace(/^\//, ''))
      filePath = existsSync(iframe) ? iframe : join(staticDir, 'iframe.html')
    }
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, 'index.html')
    }
    if (!existsSync(filePath)) {
      res.statusCode = 404
      res.end('not found')
      return
    }
    res.setHeader('Content-Type', mime[extname(filePath)] ?? 'application/octet-stream')
    createReadStream(filePath).pipe(res)
  })
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

async function collectCodeBlocks(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.docs-code, .docblock-source, pre')]
    return nodes.map((node) => node.textContent ?? '')
  })
}

async function assertReadableCode(page, label) {
  const contrast = await page.evaluate(() => {
    const node = document.querySelector('.docs-code pre, .docblock-source pre, .docs-code code')
    if (!node) {
      return null
    }
    const styles = getComputedStyle(node)
    return { color: styles.color, background: styles.backgroundColor }
  })
  if (contrast) {
    if (contrast.color === contrast.background) {
      throw new Error(`${label}: code color matches background (${contrast.color})`)
    }
  }
}

async function assertNoPageOverflow(page, label) {
  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 24,
  )
  if (overflowX) {
    throw new Error(`${label}: page-level horizontal overflow`)
  }
  return overflowX
}

const playwright = await import('playwright').catch(() => null)
if (!playwright) {
  console.error(
    'Playwright is not installed. Run npm install -D playwright and npx playwright install chromium.',
  )
  process.exit(2)
}

if (!existsSync(staticDir)) {
  console.error('storybook-static is missing. Run npm run build:storybook first.')
  process.exit(1)
}

const server = await startStaticServer(6007)
await mkdir(outDir, { recursive: true })
const browser = await playwright.chromium.launch()
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write'],
})
const notes = []

try {
  for (const story of stories) {
    for (const theme of ['light', 'dark']) {
      const url = `http://127.0.0.1:6007/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`
      const desktop = await context.newPage()
      await desktop.setViewportSize({ width: 1280, height: 800 })
      await desktop.goto(url, { waitUntil: 'networkidle' })
      const dataTheme = await desktop.evaluate(() =>
        document.documentElement.getAttribute('data-theme'),
      )
      notes.push(`${story.name} ${theme}: data-theme=${dataTheme}`)
      if (dataTheme !== theme) {
        throw new Error(`Expected data-theme=${theme} for ${story.name}, got ${dataTheme}`)
      }

      if (story.id === 'introduction--overview' && theme === 'light') {
        const copyButton = desktop.getByRole('button', { name: 'Copy code' }).first()
        await copyButton.click()
        await desktop.getByRole('status').filter({ hasText: 'Copied' }).first().waitFor()
        const copied = await desktop.evaluate(() => navigator.clipboard.readText()).catch(() => '')
        if (copied && !copied.includes('<package-name>')) {
          throw new Error(
            `Introduction copy did not contain <package-name>: ${copied.slice(0, 80)}`,
          )
        }
        if (copied && leakedImport.test(copied)) {
          throw new Error('Introduction copied source leaked an internal import')
        }
        notes.push(`introduction copy length=${copied.length}`)
      }

      if (story.id === 'validation-internationalization--catalogs' && theme === 'light') {
        await desktop.getByText('Անուն դաշտը պարտադիր է').waitFor()
        notes.push('i18n play revalidated visible errors to Armenian')
      }

      await desktop.screenshot({ path: join(outDir, `${story.name}-${theme}.png`), fullPage: true })
      await desktop.close()

      const mobile = await context.newPage()
      await mobile.setViewportSize({ width: 320, height: 640 })
      await mobile.goto(url, { waitUntil: 'networkidle' })
      const overflowX = await mobile.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 24,
      )
      notes.push(`${story.name} ${theme} mobile overflowX=${overflowX}`)
      await mobile.screenshot({
        path: join(outDir, `${story.name}-${theme}-mobile.png`),
        fullPage: true,
      })
      await mobile.close()
    }
  }

  for (const pageInfo of docsPages) {
    for (const theme of ['light', 'dark']) {
      const url = `http://127.0.0.1:6007/iframe.html?id=${pageInfo.id}&viewMode=docs&globals=theme:${theme}`
      const desktop = await context.newPage()
      await desktop.setViewportSize({ width: 1280, height: 800 })
      await desktop.goto(url, { waitUntil: 'networkidle' })
      await desktop
        .locator('.sb-preparing-docs')
        .waitFor({ state: 'hidden', timeout: 15000 })
        .catch(() => undefined)
      const pageText = await desktop.evaluate(() => document.body.innerText)
      const blocks = await collectCodeBlocks(desktop)
      const joined = `${blocks.join('\n')}\n${pageText}`
      if (!joined.includes('<package-name>')) {
        throw new Error(`${pageInfo.name} ${theme}: Docs source missing <package-name>`)
      }
      if (leakedImport.test(joined)) {
        throw new Error(`${pageInfo.name} ${theme}: Docs source leaked an internal import`)
      }
      const showCode = desktop.getByRole('button', { name: /show code/i })
      if ((await showCode.count()) > 0) {
        await showCode.first().click()
        notes.push(`${pageInfo.name} ${theme}: Show code clicked`)
      }
      const copyButtons = desktop.getByRole('button', { name: /copy( code)?/i })
      if ((await copyButtons.count()) > 0) {
        await copyButtons.first().click()
        notes.push(`${pageInfo.name} ${theme}: copy clicked`)
      }
      await assertReadableCode(desktop, `${pageInfo.name} ${theme}`)
      await desktop.screenshot({
        path: join(outDir, `${pageInfo.name}-${theme}.png`),
        fullPage: true,
      })
      await desktop.close()

      const mobile = await context.newPage()
      await mobile.setViewportSize({ width: 320, height: 640 })
      await mobile.goto(url, { waitUntil: 'networkidle' })
      const overflowX = await assertNoPageOverflow(mobile, `${pageInfo.name} ${theme} mobile`)
      notes.push(`${pageInfo.name} ${theme} mobile overflowX=${overflowX}`)
      await mobile.screenshot({
        path: join(outDir, `${pageInfo.name}-${theme}-mobile.png`),
        fullPage: true,
      })
      await mobile.close()
    }
  }

  await writeFile(join(outDir, 'notes.txt'), `${notes.join('\n')}\n`)
  console.log(notes.join('\n'))
} finally {
  await browser.close()
  server.close()
}
