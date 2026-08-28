import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { ControlledFieldsForm } from '../../examples/ControlledFieldsForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Hooks/useController',
  component: ControlledFieldsForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'useController for a date picker, parse/format currency, and a custom file widget. Native file value is never assigned programmatically. Change the price and submit.',
          'ControlledFieldsForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.controlledFields),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof ControlledFieldsForm>

export default meta
type Story = StoryObj<typeof meta>

export const CustomWidgets: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const price = canvas.getByLabelText('Price')
    await userEvent.clear(price)
    await userEvent.paste('12.50')
    await waitFor(() => expect(price).toHaveValue('12.50'))
    await userEvent.click(canvas.getByRole('button', { name: 'Submit' }))
  },
}
