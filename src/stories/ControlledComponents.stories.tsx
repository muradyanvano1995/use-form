import type { Meta, StoryObj } from '@storybook/react-vite'
import { ControlledFieldsForm } from '../examples/ControlledFieldsForm.tsx'

const meta = {
  title: 'Examples/Controlled components',
  component: ControlledFieldsForm,
} satisfies Meta<typeof ControlledFieldsForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
