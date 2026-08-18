import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginForm } from '../../examples/LoginForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Mobile',
  component: LoginForm,
  parameters: {
    viewport: { defaultViewport: 'smallMobile' },
    docs: {
      description: {
        component: withGithubExample(
          'Representative mobile canvas at 320px. Other stories also declare viewports where layout is the lesson (checkout, DevTools).',
          'LoginForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.basicUseForm),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const LoginSmall: Story = {
  globals: { theme: 'light' },
}

export const LoginSmallDark: Story = {
  globals: { theme: 'dark' },
}
