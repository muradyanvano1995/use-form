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
  { id: 'theme--overview', name: 'theme' },
]

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
const notes = []

try {
  for (const story of stories) {
    for (const theme of ['light', 'dark']) {
      const url = `http://127.0.0.1:6007/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`
      const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } })
      await desktop.goto(url, { waitUntil: 'networkidle' })
      const dataTheme = await desktop.evaluate(() =>
        document.documentElement.getAttribute('data-theme'),
      )
      notes.push(`${story.name} ${theme}: data-theme=${dataTheme}`)
      if (dataTheme !== theme) {
        throw new Error(`Expected data-theme=${theme} for ${story.name}, got ${dataTheme}`)
      }
      await desktop.screenshot({ path: join(outDir, `${story.name}-${theme}.png`), fullPage: true })
      await desktop.close()

      const mobile = await browser.newPage({ viewport: { width: 320, height: 640 } })
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
  await writeFile(join(outDir, 'notes.txt'), `${notes.join('\n')}\n`)
  console.log(notes.join('\n'))
} finally {
  await browser.close()
  server.close()
}
