import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { UsernameAvailabilityForm } from '../../examples/UsernameAvailabilityForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Async validation',
  component: UsernameAvailabilityForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'rules.async with debounce on change. Blur and submit skip the delay. Taken names: admin, root, taken. See Validation/Async validation for createAsyncRule.',
          'UsernameAvailabilityForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.asyncValidation),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof UsernameAvailabilityForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Username'), 'admin')
    await userEvent.tab()
    await waitFor(() => expect(canvas.getByText('Username is already taken')).toBeVisible())
  },
}
