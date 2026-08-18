import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginForm } from '../../examples/LoginForm.tsx'
import { ValidationMode } from '../../lib/index.ts'
import { modeArgType, reValidateModeArgType } from '../preview/controls.ts'

const meta = {
  title: 'Core Concepts/Validation modes',
  component: LoginForm,
  args: {
    mode: ValidationMode.OnSubmit,
    focusOnError: true,
  },
  argTypes: {
    mode: modeArgType,
    reValidateMode: reValidateModeArgType,
    focusOnError: { control: 'boolean' },
    disabled: { table: { disable: true } },
    preventDuplicateSubmit: { table: { disable: true } },
    onSubmitSuccess: { table: { disable: true } },
    onSubmitInvalid: { table: { disable: true } },
    onReset: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Same login form; change `mode` in Controls. onSubmit waits until submit; onBlur validates when leaving a field; onChange validates while typing. reValidateMode applies after the first submit.',
      },
    },
  },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {}
