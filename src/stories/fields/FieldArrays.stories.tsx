import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { OrderItemsForm } from '../../examples/OrderItemsForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Fields/Field arrays',
  component: OrderItemsForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'useFieldArray append, insert, remove, move, swap, update, clear. minItems on the array. File per row. Submit does not console.log files.',
          'OrderItemsForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.fieldArrays),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof OrderItemsForm>

export default meta
type Story = StoryObj<typeof meta>

export const OrderItems: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Append' }))
    await expect(canvas.getAllByLabelText('Name').length).toBeGreaterThan(1)
    await userEvent.click(canvas.getAllByRole('button', { name: 'Remove' })[1]!)
    await userEvent.click(canvas.getByRole('button', { name: 'Insert first' }))
    const downs = canvas.getAllByRole('button', { name: 'Down' })
    await userEvent.click(downs[0]!)
  },
}
