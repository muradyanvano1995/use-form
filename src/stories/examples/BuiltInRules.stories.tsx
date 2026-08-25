import type { Meta, StoryObj } from '@storybook/react-vite'
import { RegistrationForm } from '../../examples/RegistrationForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Built-in rules',
  component: RegistrationForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Registration form exercising required, email, minLength, min, accepted, matchesField, and createRule. Full rules catalog: Validation/Built-in rules.',
          'RegistrationForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.builtInRules),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof RegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
