import type { Meta, StoryObj } from '@storybook/react-vite'
import { ContextProfileForm } from '../../examples/ContextProfileForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Examples/Form context',
  component: ContextProfileForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'FormProvider + useFormContext / useController without prop-drilling. SubmitButton uses useFormState for isSubmitting.',
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

export const Default: Story = {}
