import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ConditionalFieldsDemo } from '../../examples/ConditionalCompanyForm.tsx'

const meta = {
  title: 'Fields/Conditional fields',
  component: ConditionalFieldsDemo,
  args: {
    shouldUnregister: true,
    onSubmitSuccess: fn(),
  },
  argTypes: {
    shouldUnregister: {
      control: 'boolean',
      description:
        'When true, hidden company fields are removed from values. When false, previous values are preserved.',
    },
    onSubmitSuccess: { action: 'submitSuccess' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Toggle Company to mount nested fields. Tax TAKEN runs a 400ms async check that aborts if you hide the fields. Split into unregister vs preserve via the control — both behaviors remain covered.',
      },
    },
  },
} satisfies Meta<typeof ConditionalFieldsDemo>

export default meta
type Story = StoryObj<typeof meta>

export const UnregisterOnHide: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('radio', { name: 'Company' }))
    await expect(canvas.getByLabelText('Company name')).toBeVisible()
    await userEvent.click(canvas.getByRole('radio', { name: 'Personal' }))
    await expect(canvas.queryByLabelText('Company name')).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }))
    await expect(args.onSubmitSuccess).toHaveBeenCalled()
  },
}

export const PreserveOnHide: Story = {
  args: { shouldUnregister: false },
}
