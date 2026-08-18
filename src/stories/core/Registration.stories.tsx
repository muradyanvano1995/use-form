import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginForm } from '../../examples/LoginForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Core Concepts/Registration',
  component: LoginForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'register(name) returns name, id, onChange, onBlur, ref, aria-invalid, aria-describedby. File fields omit value. Radios pass type and value. This is the native-control path; custom widgets use useController instead.',
          'LoginForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.registration),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const NativeRegister: Story = {}
