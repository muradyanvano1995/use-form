import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ControlledFieldsForm } from '../../examples/ControlledFieldsForm.tsx'

const meta = {
  title: 'Fields/Controlled fields',
  component: ControlledFieldsForm,
  parameters: {
    docs: {
      description: {
        component:
          'useController for a date picker, parse/format currency, and a custom file widget. Native file value is never assigned programmatically. Change the price and submit.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof ControlledFieldsForm>

export default meta
type Story = StoryObj<typeof meta>

export const CustomWidgets: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const price = canvas.getByLabelText('Price')
    await userEvent.clear(price)
    await userEvent.type(price, '12.50')
    await expect(canvas.getByText(/Stored as number: 12.5/)).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }))
  },
}
