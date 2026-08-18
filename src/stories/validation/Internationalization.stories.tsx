import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { LocalizedRegistrationForm } from '../../examples/LocalizedRegistrationForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

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
      description:
        'Application catalogs and labels. The core library does not rewrite existing errors until the next validation cycle; this example revalidates after the new catalogs commit when errors are already visible.',
    },
    onLocaleChange: { action: 'localeChange' },
  },
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'fieldLabels + validationMessages catalogs. Switching language refreshes visible errors automatically after the new catalogs commit. A pristine form is not validated. Core useForm still does not rewrite resolved strings on catalog identity changes.',
          'LocalizedRegistrationForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.internationalization),
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
    await waitFor(() => expect(canvas.getByText(/Անուն դաշտը պարտադիր է/)).toBeVisible())
  },
}
