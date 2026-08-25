import type { Meta, StoryObj } from '@storybook/react-vite'
import { PasswordQualityForm } from '../../examples/PasswordQualityForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Structured errors',
  component: PasswordQualityForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'criteriaMode all lists every password issue. errorDetails.issues is structured; errors.password stays a string. Submit can apply a server-source issue.',
          'PasswordQualityForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.structuredErrors),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof PasswordQualityForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
