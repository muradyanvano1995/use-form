import type { Meta, StoryObj } from '@storybook/react-vite'
import { WatchersForm } from '../../examples/WatchersForm.tsx'
import { Callout, DocsPage, Kicker } from '../components/DocsUi.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

function FormStateGuide() {
  return (
    <DocsPage>
      <Kicker>Hooks</Kicker>
      <h1>useForm</h1>
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
  title: 'Hooks/useForm',
  component: WatchersForm,
  parameters: {
    docs: {
      description: {
        component: withGithubExample(
          'Primary form hook: owns values, errors, touched/dirty, validation, and submit. The useForm caller re-renders on any store change; isolate children with useWatch / useFormState / useFieldState.',
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
