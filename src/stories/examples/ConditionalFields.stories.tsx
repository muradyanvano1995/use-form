import type { Meta, StoryObj } from '@storybook/react-vite'
import { ConditionalCompanyForm } from '../../examples/ConditionalCompanyForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Conditional fields',
  component: ConditionalCompanyForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Toggle company fields with shouldUnregister / unregister. Inactive optional values leave submit/resolver input.',
          'ConditionalCompanyForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.conditionalFields),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof ConditionalCompanyForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
