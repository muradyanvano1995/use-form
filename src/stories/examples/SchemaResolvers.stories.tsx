import type { Meta, StoryObj } from '@storybook/react-vite'
import { ResolverRegistrationForm } from '../../examples/ResolverRegistrationForm.tsx'
import { StandardSchemaForm } from '../../examples/StandardSchemaForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Schema resolvers',
  component: StandardSchemaForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Custom FormResolver and standardSchemaResolver (dedicated subpath). Resolvers run after rules/validate; output types can differ from live input.',
          'StandardSchemaForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.schemaResolver),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof StandardSchemaForm>

export default meta
type Story = StoryObj<typeof meta>

export const StandardSchema: Story = {}

export const CustomResolver: Story = {
  render: () => <ResolverRegistrationForm />,
  parameters: {
    docs: {
      description: {
        story:
          'Hand-written FormResolver with resolverContext.minimumAge. Emails ending in @blocked.test set a server error.',
      },
    },
  },
}
