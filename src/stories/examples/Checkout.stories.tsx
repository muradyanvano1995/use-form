import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { CheckoutForm } from '../../examples/CheckoutForm.tsx'
import { disabledArgType } from '../preview/controls.ts'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Checkout',
  component: CheckoutForm,
  args: {
    disabled: false,
    onSubmitSuccess: fn(),
    onSubmitInvalid: fn(),
    onItemAppend: fn(),
    onItemRemove: fn(),
  },
  argTypes: {
    disabled: disabledArgType,
    onSubmitSuccess: { action: 'submitSuccess' },
    onSubmitInvalid: { action: 'submitInvalid' },
    onItemAppend: { action: 'itemAppend' },
    onItemRemove: { action: 'itemRemove' },
  },
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Combines nested fields, field arrays, files, validation, and coupon FAIL backend mapping. File contents are not logged.',
          'CheckoutForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.fieldArrays),
    },
    viewport: { defaultViewport: 'desktop' },
  },
} satisfies Meta<typeof CheckoutForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Add item' }))
    await expect(args.onItemAppend).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Remove item 2' }))
    await expect(args.onItemRemove).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Place order' }))
    await expect(args.onSubmitInvalid).toHaveBeenCalled()
  },
}

export const Mobile: Story = {
  globals: { theme: 'light' },
  parameters: {
    viewport: { defaultViewport: 'smallMobile' },
    docs: { description: { story: 'Checkout at 320px. Rows stack; buttons remain tappable.' } },
  },
}

export const DarkMobile: Story = {
  globals: { theme: 'dark' },
  parameters: {
    viewport: { defaultViewport: 'smallMobile' },
    docs: { description: { story: 'Dark preview at small mobile width.' } },
  },
}
