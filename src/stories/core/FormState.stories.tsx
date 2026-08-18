import type { Meta, StoryObj } from '@storybook/react-vite'
import { WatchersForm } from '../../examples/WatchersForm.tsx'
import { Callout, DocsPage, Kicker } from '../components/DocsUi.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

function FormStateGuide() {
  return (
    <DocsPage>
      <Kicker>Core Concepts</Kicker>
      <h1>Form state</h1>
      <p>
        <code>useForm</code> owns values, defaultValues, errors, errorDetails, touched, dirty,
        isValid, isSubmitting, isValidating, submitCount, and async-default flags. The hook
        subscriber re-renders fully. Child isolation uses <code>useWatch</code> /{' '}
        <code>useFormState</code> / <code>useFieldState</code>.
      </p>
      <Callout tone="info" title="Live demo">
        <p>The canvas below is the watchers example: a child reads title without prop drilling.</p>
      </Callout>
    </DocsPage>
  )
}

const meta = {
  title: 'Core Concepts/Form state',
  component: WatchersForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Store snapshot fields and why the useForm caller re-renders.',
          'WatchersForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.formState),
    },
    controls: { disable: true },
  },
} satisfies Meta<typeof WatchersForm>

export default meta
type Story = StoryObj<typeof meta>

export const Guide: Story = {
  render: () => <FormStateGuide />,
  parameters: { controls: { disable: true }, actions: { disable: true } },
}

export const WatchersDemo: Story = {}
