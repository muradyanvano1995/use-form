import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginForm } from '../../examples/LoginForm.tsx'

const meta = {
  title: 'Examples/Mobile',
  component: LoginForm,
  parameters: {
    viewport: { defaultViewport: 'smallMobile' },
    docs: {
      description: {
        component:
          'Representative mobile canvas at 320px. Other stories also declare viewports where layout is the lesson (checkout, DevTools).',
      },
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const LoginSmall: Story = {
  globals: { theme: 'light' },
}

export const LoginSmallDark: Story = {
  globals: { theme: 'dark' },
}
