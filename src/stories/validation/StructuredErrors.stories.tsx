import type { Meta, StoryObj } from '@storybook/react-vite'
import { PasswordQualityForm } from '../../examples/PasswordQualityForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Validation/Structured errors',
  component: PasswordQualityForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'criteriaMode all lists every password issue. errorDetails.issues is the structured view; errors.password remains a string. Submit applies a server-source issue. Root error is announced but is not a focus target. Apply manual error is a documented helper, not a hidden debug hook.',
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

export const AllCriteria: Story = {}
