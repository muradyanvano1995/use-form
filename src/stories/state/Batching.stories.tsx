import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { BatchedAddressForm } from '../../examples/BatchedAddressForm.tsx'

const meta = {
  title: 'State and Performance/Batching',
  component: BatchedAddressForm,
  parameters: {
    docs: {
      description: {
        component:
          'form.batch() applies several setValue calls as one notification. getDirtyValues() is an imperative getter and does not subscribe.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof BatchedAddressForm>

export default meta
type Story = StoryObj<typeof meta>

export const AtomicFill: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Fill city and country atomically' }))
    await waitFor(() => expect(canvas.getByLabelText('City')).toHaveValue('Yerevan'))
    await expect(canvas.getByLabelText('Country')).toHaveValue('Armenia')
  },
}
