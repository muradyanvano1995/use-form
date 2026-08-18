import type { Meta, StoryObj } from '@storybook/react-vite'
import { WatchersForm } from '../../examples/WatchersForm.tsx'

const meta = {
  title: 'State and Performance/Watchers',
  component: WatchersForm,
  parameters: {
    docs: {
      description: {
        component:
          'useWatch({ name: "title" }) from context. Distinct from useFormState: watchers read values, form-state selectors read flags/errors.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof WatchersForm>

export default meta
type Story = StoryObj<typeof meta>

export const UseWatch: Story = {}
