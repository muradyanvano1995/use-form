/**
 * Serve storybook-static and run @storybook/test-runner (real play + a11y).
 * Requires `npm run build:storybook` first.
 *
 * Uses async spawn so the HTTP server can respond while test-runner runs
 * (spawnSync would block the event loop and hang the health check).
 */
import { spawn } from 'node:child_process'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'

const root = process.cwd()
const staticDir = join(root, 'storybook-static')
const preferredPort = Number(process.env.STORYBOOK_BROWSER_PORT ?? 6010)

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

if (!existsSync(staticDir)) {
  console.error('storybook-static is missing. Run npm run build:storybook first.')
  process.exit(1)
}

function resolveStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname)
  if (decoded === '/' || decoded === '') {
    return join(staticDir, 'index.html')
  }

  let filePath = join(staticDir, decoded.replace(/^\//, ''))
  if (!existsSync(filePath)) {
    filePath = join(staticDir, 'iframe.html')
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html')
  }
  return filePath
}

function startStaticServer(port) {
  const server = createServer((req, res) => {
    const requestUrl = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
    const filePath = resolveStaticPath(requestUrl.pathname)
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      res.statusCode = 404
      res.end('not found')
      return
    }
    res.setHeader('Content-Type', mime[extname(filePath)] ?? 'application/octet-stream')
    createReadStream(filePath).pipe(res)
  })

  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => {
      const address = server.address()
      const actualPort = typeof address === 'object' && address ? address.port : port
      resolve({ server, port: actualPort })
    })
  })
}

async function waitForStorybook(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const [rootRes, indexRes] = await Promise.all([
        fetch(url, { method: 'GET' }),
        fetch(new URL('index.json', url), { method: 'GET' }),
      ])
      if (rootRes.status === 200 && indexRes.status === 200) {
        return
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Storybook static server did not become ready at ${url}`)
}

function runTestRunner(url) {
  const testRunnerBin = join(
    root,
    'node_modules',
    '@storybook',
    'test-runner',
    'dist',
    'test-storybook.js',
  )

  if (!existsSync(testRunnerBin)) {
    throw new Error('Missing @storybook/test-runner. Run npm ci.')
  }

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [testRunnerBin, '--url', url, '--index-json', '--maxWorkers=2', '--ci'],
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          TARGET_URL: url,
        },
      },
    )
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`test-storybook exited with signal ${signal}`))
        return
      }
      resolve(code ?? 1)
    })
  })
}

const { server, port } = await startStaticServer(preferredPort)
const url = `http://127.0.0.1:${port}`
console.log(`Serving storybook-static at ${url}`)

let status = 1
try {
  await waitForStorybook(url)
  status = await runTestRunner(url)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  status = 1
} finally {
  server.close()
}

process.exit(status)
