import type { Meta, StoryObj } from '@storybook/react-vite'
import { RadioCheckboxGroupsForm } from '../../examples/RadioCheckboxGroupsForm.tsx'

const meta = {
  title: 'Fields/Radio and checkbox groups',
  component: RadioCheckboxGroupsForm,
  parameters: {
    docs: {
      description: {
        component:
          'Radio groups share a register name with type radio and value. Checkboxes are booleans. Both use fieldset/legend.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof RadioCheckboxGroupsForm>

export default meta
type Story = StoryObj<typeof meta>

export const Groups: Story = {}
