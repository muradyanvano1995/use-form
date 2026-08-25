import type { Meta, StoryObj } from '@storybook/react-vite'
import { ContextProfileForm } from '../../examples/ContextProfileForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Hooks/useFormContext',
  component: ContextProfileForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'useFormContext<T>() reads the nearest FormProvider control. Missing provider throws. Explicit control on hooks still overrides context. See Components/FormProvider for the provider component.',
          'ContextProfileForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.context),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof ContextProfileForm>

export default meta
type Story = StoryObj<typeof meta>

export const FromProvider: Story = {}
