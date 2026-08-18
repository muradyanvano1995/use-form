import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { LocalizedRegistrationForm } from '../../examples/LocalizedRegistrationForm.tsx'

const meta = {
  title: 'Validation/Internationalization',
  component: LocalizedRegistrationForm,
  args: {
    onLocaleChange: fn(),
  },
  argTypes: {
    locale: {
      control: 'radio',
      options: ['en', 'hy'],
      description: 'Catalog and labels. Existing errors do not rewrite until you revalidate.',
    },
    onLocaleChange: { action: 'localeChange' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'fieldLabels + validationMessages catalogs. No translation library. Switch to Armenian, then click Revalidate after a failed submit.',
      },
    },
  },
} satisfies Meta<typeof LocalizedRegistrationForm>

export default meta
type Story = StoryObj<typeof meta>

export const Catalogs: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Validate and submit' }))
    await expect(canvas.getByText(/Full name is required/)).toBeVisible()
    await userEvent.click(canvas.getByRole('radio', { name: 'Հայերեն' }))
    await expect(args.onLocaleChange).toHaveBeenCalledWith('hy')
    await userEvent.click(canvas.getByRole('button', { name: 'Վերավավերացնել' }))
    await expect(canvas.getByText(/Անուն դաշտը պարտադիր է/)).toBeVisible()
  },
}
