import { useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { normalizeErrors } from '../../lib'
import { Callout, CodePanel, DocsPage, Kicker } from '../components/DocsUi.tsx'
import { consumerDocsSource } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const SAMPLE_RAW = `{
  "email": "Email is required",
  "password": "",
  "__proto__": "drop me",
  "profile.city": "City is required"
}`

function NormalizeErrorsPage() {
  const [raw, setRaw] = useState(SAMPLE_RAW)
  const result = useMemo(() => {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>
      return { ok: true as const, value: normalizeErrors(parsed) }
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : 'Invalid JSON',
      }
    }
  }, [raw])

  return (
    <DocsPage>
      <Kicker>Helpers</Kicker>
      <h1>normalizeErrors</h1>
      <p className="docs-lead">
        Adapter helper: drop empty messages and unsafe path keys from a sparse error map before
        merging into form state. Used by custom resolvers and backend mappers.
      </p>
      <Callout tone="info" title="Controls">
        <p>This page is a helper playground, not a form canvas.</p>
      </Callout>
      <CodePanel title="Usage" code={snippets.normalizeErrors} />
      <div className="demo-form">
        <label className="demo-form__field">
          Raw JSON map
          <textarea
            rows={8}
            value={raw}
            onChange={(event) => {
              setRaw(event.target.value)
            }}
            spellCheck={false}
          />
        </label>
        <pre className="demo-form__meta">
          {result.ok ? JSON.stringify(result.value, null, 2) : `Error: ${result.message}`}
        </pre>
      </div>
    </DocsPage>
  )
}

const meta = {
  title: 'Core Concepts/normalizeErrors',
  component: NormalizeErrorsPage,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    docs: {
      description: {
        component:
          'normalizeErrors strips empty strings and unsafe path segments from FieldErrors maps. Edit the JSON sample to see the cleaned result. Controls are empty because this is a helper playground.',
      },
      source: consumerDocsSource(snippets.normalizeErrors),
    },
  },
} satisfies Meta<typeof NormalizeErrorsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
