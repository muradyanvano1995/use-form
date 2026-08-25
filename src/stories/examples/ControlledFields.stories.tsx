import type { Meta, StoryObj } from '@storybook/react-vite'
import { ControlledFieldsForm } from '../../examples/ControlledFieldsForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Controlled fields',
  component: ControlledFieldsForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'useController for date, parse/format currency, and a custom file widget. Native file selection is never assigned programmatically.',
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

export const Default: Story = {}
