import type { Meta, StoryObj } from '@storybook/react-vite'
import { Callout, DocsPage, FeatureList, Kicker } from '../components/DocsUi.tsx'
import { CodePanel } from '../components/CodePanel.tsx'

function MigrationPage() {
  return (
    <DocsPage>
      <Kicker>Stability</Kicker>
      <h1>Migration policy</h1>
      <p className="docs-lead">
        There is <strong>no published release</strong> yet, so there are no version-to-version
        migrations. Treat <code>docs/public-api.md</code> as the intended 0.x surface.
      </p>

      <Callout tone="info" title="Controls">
        <p>
          Storybook Controls are empty because this page is static documentation, not a component
          playground.
        </p>
      </Callout>

      <Callout tone="warning" title="Unpublished">
        <p>
          Do not invent migrations for unpublished snapshots. Breaking changes before 1.0 should
          still be documented in the changelog when a public 0.x exists.
        </p>
      </Callout>

      <h2>Current stability</h2>
      <FeatureList
        items={[
          {
            title: 'Stable public API',
            body: 'Keep unless a documented breaking change is required before 1.0.',
          },
          {
            title: 'Experimental',
            body: 'May change without a migration guide until 1.0. None on core today.',
          },
          {
            title: 'Subpath-only exports',
            body: 'FormDevTools and standardSchemaResolver stay off the core barrel.',
          },
        ]}
      />

      <h2>Resolver import</h2>
      <p>
        <code>standardSchemaResolver</code> was removed from the core barrel before any publish.
        Import it from the dedicated subpath:
      </p>
      <CodePanel
        title="Resolver subpath"
        code={`import { standardSchemaResolver } from '@muradyanvano/use-form/resolvers/standard-schema'`}
      />

      <h2>After 0.x publishes</h2>
      <ul>
        <li>
          Breaking changes should land in a new minor or major according to the chosen 0.x policy,
          with a changelog entry.
        </li>
        <li>Do not invent migrations for unpublished snapshots.</li>
        <li>React peer range stays honest: only versions that are tested.</li>
      </ul>
    </DocsPage>
  )
}

const meta = {
  title: 'Migration',
  component: MigrationPage,
  parameters: {
    layout: 'fullscreen',
    controls: { exclude: /./ },
    docs: {
      description: {
        component:
          'Migration policy while unpublished: no version-to-version guides yet. Public inventory in docs/public-api.md. standardSchemaResolver is resolver-entry-only. Controls are empty because this page is static documentation.',
      },
    },
    a11y: { test: 'todo' },
  },
} satisfies Meta<typeof MigrationPage>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {}
