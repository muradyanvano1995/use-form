import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor, within } from 'storybook/test'
import { AsyncDefaultsProfileForm } from '../../examples/AsyncDefaultsProfileForm.tsx'
import { fn } from 'storybook/test'

const meta = {
  title: 'Validation/Async defaults',
  component: AsyncDefaultsProfileForm,
  args: {
    loadOutcome: 'success',
    onLoaded: fn(),
    onLoadFailed: fn(),
  },
  argTypes: {
    loadOutcome: {
      control: 'radio',
      options: ['success', 'failure'],
      description: 'Deterministic loader result (350ms). Remounts the story when changed.',
    },
    onLoaded: { action: 'defaultsLoaded' },
    onLoadFailed: { action: 'defaultsFailed' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Sync fallback renders immediately. Successful load becomes the reset baseline. preserveDirty keeps edits. Switch loadOutcome to failure in Controls.',
      },
    },
  },
} satisfies Meta<typeof AsyncDefaultsProfileForm>

export default meta
type Story = StoryObj<typeof meta>

export const LoadedProfile: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByLabelText('Name')).toHaveValue('Server Name'))
    await expect(args.onLoaded).toHaveBeenCalledWith({ name: 'Server Name' })
  },
}

export const FailedLoad: Story = {
  args: { loadOutcome: 'failure' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(args.onLoadFailed).toHaveBeenCalled())
    await expect(canvas.getByRole('alert')).toHaveTextContent(/Could not reach/)
  },
}
