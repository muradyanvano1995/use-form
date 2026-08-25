import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ImperativeApiForm } from '../../examples/ImperativeApiForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Core Concepts/Imperative mutations',
  component: ImperativeApiForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'validateField, setError, clearError, clearRootError, and clearErrors. Set note to block then Validate form for a pathless rootError. Getters stay under Imperative getters. No public setFocus API.',
          'ImperativeApiForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.imperativeMutations),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof ImperativeApiForm>

export default meta
type Story = StoryObj<typeof meta>

export const ValidateAndClear: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Validate email' }))
    await expect(canvas.getByText('Email is required')).toBeVisible()
    await expect(canvas.getByText(/Last validateField\(email\): invalid/)).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'clearError email' }))
    await expect(canvas.queryByText('Email is required')).not.toBeInTheDocument()
  },
}
