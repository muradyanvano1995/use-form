import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoginForm } from '../../examples/LoginForm.tsx'
import {
  Callout,
  CodePanel,
  DocsPage,
  ExampleShell,
  FeatureList,
  Kicker,
} from '../components/DocsUi.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

function AccessibilityPage() {
  return (
    <DocsPage>
      <Kicker>Inclusive forms</Kicker>
      <h1>Accessibility</h1>
      <p className="docs-lead">
        The library is headless. Accessible names, descriptions, error focus, and live regions are
        the product of how you wire <code>register</code> / <code>useController</code> to HTML. The
        LabelsAndErrorIds story renders the login example.
      </p>

      <Callout tone="info" title="Controls">
        <p>
          Storybook Controls are empty because this page is static documentation. LabelsAndErrorIds
          uses LoginForm defaults rather than a Controls playground.
        </p>
      </Callout>

      <h2>Labels</h2>
      <p>
        Associate every control with a visible label. Use{' '}
        <code>{'htmlFor={form.getFieldId(path)}'}</code> so the id matches <code>register</code>. Do
        not rely on placeholder text as the only name.
      </p>
      <CodePanel title="Label + field id" code={snippets.registration} />

      <h2>Fieldset and legend</h2>
      <p>
        Group related controls (credentials, address, radio options) in a <code>fieldset</code> with
        a <code>legend</code>. Radio options share the field <code>name</code> and error id, and
        keep distinct element ids.
      </p>

      <h2>aria-invalid and aria-describedby</h2>
      <p>
        <code>register</code> and <code>useController</code> expose <code>aria-invalid</code> and{' '}
        <code>aria-describedby</code>. Render the message element with{' '}
        <code>{'id={form.getErrorId(path)}'}</code> so the description points at the text the user
        can read.
      </p>
      <CodePanel
        title="Error description"
        code={`{form.errors.email ? (
  <p id={form.getErrorId('email')}>{form.errors.email}</p>
) : null}`}
      />

      <h2>focusOnError</h2>
      <p>
        Defaults to <code>true</code>. After a failed submit, focus moves to the first invalid
        registered field (registration order, nested paths included). Field and error ids encode
        path dots so <code>address.city</code> does not collide with <code>address-city</code>.
      </p>

      <h2>Root errors are not focus targets</h2>
      <p>
        Pathless resolver issues live on <code>form.rootError</code> /{' '}
        <code>form.rootErrorDetails</code>. They block validity and submit, and should be announced
        in the UI, but first-error focus never uses a synthetic root target. Put root copy in a live
        region, then keep field messages next to fields.
      </p>

      <h2>Live regions</h2>
      <ul>
        <li>
          Use <code>{'role="alert"'}</code> for submit or banner failures that must interrupt.
        </li>
        <li>
          Use <code>{'role="status"'}</code> for success or non-urgent status.
        </li>
        <li>
          Field errors next to inputs are usually enough once <code>aria-describedby</code> is set.
          Avoid duplicating the same string in a second polite region on every keystroke.
        </li>
      </ul>

      <h2>Reduced motion</h2>
      <p>
        Storybook tokens honor <code>prefers-reduced-motion</code> by collapsing animation and
        transition durations. Example forms should not add decorative motion that ignores that
        preference. Validation and submit must not depend on animation to convey state.
      </p>

      <h2>Keyboard</h2>
      <FeatureList
        items={[
          {
            title: 'Native submit',
            body: 'Enter in a text field submits the form through handleSubmit. Keep a real submit button.',
          },
          {
            title: 'Focus order',
            body: 'DOM order should match reading order. Disabled submit while isSubmitting is fine; do not trap focus.',
          },
          {
            title: 'Custom controls',
            body: 'useController field.ref must land on a focusable element so focusOnError still works.',
          },
          {
            title: 'Visible focus',
            body: 'Docs CSS uses --docs-focus-ring on :focus-visible. Example controls should keep a comparable ring.',
          },
        ]}
      />

      <Callout tone="success" title="Login example">
        <p>
          Open the LabelsAndErrorIds story for a complete pattern: fieldset/legend, labeled email
          and password, checkbox, alert banner, status message, and reset.
        </p>
      </Callout>
    </DocsPage>
  )
}

const meta = {
  title: 'Accessibility',
  component: AccessibilityPage,
  parameters: {
    layout: 'fullscreen',
    controls: {
      exclude: /./,
    },
    docs: {
      description: {
        component: withGithubExample(
          'Accessibility guide for labels, fieldset/legend, aria-invalid, aria-describedby, focusOnError, root errors, live regions, reduced motion, and keyboard use. Controls are empty because the guide is static documentation. LabelsAndErrorIds renders LoginForm.',
          'LoginForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.registration),
    },
  },
} satisfies Meta<typeof AccessibilityPage>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {}

export const LabelsAndErrorIds: Story = {
  render: () => (
    <ExampleShell
      title="Labels and error ids"
      description="LoginForm wires htmlFor, getFieldId, getErrorId, aria-invalid, and aria-describedby. Submit empty fields to see focus-on-error."
    >
      <LoginForm />
    </ExampleShell>
  ),
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'Live LoginForm from src/examples. Labels use getFieldId; messages use getErrorId; register supplies aria-invalid and aria-describedby.',
      },
      source: consumerDocsSource(snippets.registration),
    },
  },
}
