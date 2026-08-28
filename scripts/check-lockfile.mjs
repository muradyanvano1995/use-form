import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { rootDir, assert } from './package-utils.mjs'

const lockfilePath = path.join(rootDir, 'package-lock.json')
assert(existsSync(lockfilePath), 'package-lock.json is missing; commit a lockfile for npm ci')

const npmCli = process.env.npm_execpath
const result = npmCli
  ? spawnSync(process.execPath, [npmCli, 'ci', '--dry-run', '--ignore-scripts'], {
      cwd: rootDir,
      encoding: 'utf8',
    })
  : spawnSync('npm', ['ci', '--dry-run', '--ignore-scripts'], {
      cwd: rootDir,
      encoding: 'utf8',
      shell: true,
    })

if (result.status !== 0) {
  const detail = [result.error?.message, result.stderr, result.stdout]
    .filter(Boolean)
    .join('\n')
    .trim()
  throw new Error(
    `package-lock.json is inconsistent with package.json (npm ci --dry-run failed).${
      detail ? `\n${detail}` : ''
    }`,
  )
}

console.log('lockfile:check OK (npm ci --dry-run)')
