import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { RegistrationForm } from '../../examples/RegistrationForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Core Concepts/Reset',
  component: RegistrationForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'reset() restores the default-value baseline. resetField("password") clears one path. After a successful create, this example resets the whole form.',
          'RegistrationForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.reset),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof RegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const ResetAndResetField: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Full name'), 'Ada')
    await userEvent.click(canvas.getByRole('button', { name: 'Reset' }))
    await expect(canvas.getByLabelText('Full name')).toHaveValue('')
  },
}
