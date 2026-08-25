import type { Meta, StoryObj } from '@storybook/react-vite'
import { LocalizedRegistrationForm } from '../../examples/LocalizedRegistrationForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Internationalization',
  component: LocalizedRegistrationForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'fieldLabels + validationMessages catalogs (en / hy). Switch locale and revalidate when errors are already visible.',
          'LocalizedRegistrationForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.internationalization),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof LocalizedRegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
