import type { TestRunnerConfig } from '@storybook/test-runner'
import { getStoryContext, waitForPageReady } from '@storybook/test-runner'
import { checkA11y, configureAxe, injectAxe } from 'axe-playwright'

type A11yParameters = {
  test?: 'error' | 'todo' | 'off'
  disable?: boolean
  element?: string
  config?: {
    rules?: Array<{ id: string; enabled?: boolean }>
  }
}

function readA11yParameters(value: unknown): A11yParameters | undefined {
  if (value == null || typeof value !== 'object') {
    return undefined
  }

  const record = value as {
    test?: unknown
    disable?: unknown
    element?: unknown
    config?: { rules?: unknown }
  }

  const test =
    record.test === 'error' || record.test === 'todo' || record.test === 'off'
      ? record.test
      : undefined
  const disable = typeof record.disable === 'boolean' ? record.disable : undefined
  const element = typeof record.element === 'string' ? record.element : undefined
  const rules = Array.isArray(record.config?.rules)
    ? (record.config.rules as Array<{ id: string; enabled?: boolean }>)
    : undefined

  return {
    test,
    disable,
    element,
    config: rules ? { rules } : undefined,
  }
}

/**
 * Runs real CSF `play` functions in Chromium via Storybook test-runner,
 * and fails on serious accessibility violations when `parameters.a11y.test` is `error`.
 */
const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page)
  },
  async postVisit(page, context) {
    await waitForPageReady(page)
    const storyContext = await getStoryContext(page, context)
    const a11yParam = readA11yParameters(storyContext.parameters?.a11y)
    if (a11yParam?.test === 'off' || a11yParam?.disable === true) {
      return
    }

    await configureAxe(page, {
      rules: a11yParam?.config?.rules,
    })

    const element = a11yParam?.element ?? '#storybook-root'
    await checkA11y(page, element, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: {
        resultTypes: ['violations'],
      },
    })
  },
}

export default config
