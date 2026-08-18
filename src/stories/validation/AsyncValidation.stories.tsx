import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { UsernameAvailabilityForm } from '../../examples/UsernameAvailabilityForm.tsx'

const meta = {
  title: 'Validation/Async validation',
  component: UsernameAvailabilityForm,
  parameters: {
    docs: {
      description: {
        component:
          'rules.async with debounce 400ms on change. Blur and submit skip the delay. Fake network is 120ms. Taken names: admin, root, taken. Abort on change cancels in-flight checks.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof UsernameAvailabilityForm>

export default meta
type Story = StoryObj<typeof meta>

export const DebouncedUsername: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText('Username')
    await userEvent.type(input, 'admin')
    await userEvent.tab()
    await waitFor(() => expect(canvas.getByText('Username is already taken')).toBeVisible())
  },
}
