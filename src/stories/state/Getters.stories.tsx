import type { Meta, StoryObj } from '@storybook/react-vite'
import { BatchedAddressForm } from '../../examples/BatchedAddressForm.tsx'

const meta = {
  title: 'State and Performance/Imperative getters',
  component: BatchedAddressForm,
  parameters: {
    docs: {
      description: {
        component:
          'getValues, getValue, getErrors, getErrorDetails, getFieldState, getDirtyValues, getTouchedValues do not subscribe. The preview JSON is getDirtyValues() after a batch.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof BatchedAddressForm>

export default meta
type Story = StoryObj<typeof meta>

export const DirtySnapshot: Story = {}
