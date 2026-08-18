import type { Meta, StoryObj } from '@storybook/react-vite'
import { WatchersForm } from '../../examples/WatchersForm.tsx'

const meta = {
  title: 'State and Performance/Subscriptions',
  component: WatchersForm,
  parameters: {
    docs: {
      description: {
        component:
          'useFormState selectors isolate dirty flags. The useForm caller still re-renders; memoize children that subscribe.',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof WatchersForm>

export default meta
type Story = StoryObj<typeof meta>

export const Selectors: Story = {}
