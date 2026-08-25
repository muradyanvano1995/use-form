import type { Meta, StoryObj } from '@storybook/react-vite'
import { WatchersForm } from '../../examples/WatchersForm.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const meta = {
  title: 'Hooks/useFieldState',
  component: WatchersForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'useFieldState(control, name) subscribes to one field’s error, touched, dirty, and invalid flags. Prefer it over useFormState when you only need a single path. Distinct from useWatch, which reads values.',
          'WatchersForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.watchers),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof WatchersForm>

export default meta
type Story = StoryObj<typeof meta>

export const FieldSlice: Story = {}
