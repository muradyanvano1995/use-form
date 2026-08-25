import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { rules, useForm, ValidationMode } from '../../lib'
import {
  Callout,
  CodePanel,
  DocsPage,
  ExampleShell,
  FeatureList,
  GithubSourceLink,
  Kicker,
  StateInspector,
} from '../components/DocsUi.tsx'
import { consumerDocsSource } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

type EmailFieldValues = {
  email: string
}

function EmailFieldDemo() {
  const form = useForm<EmailFieldValues>({
    defaultValues: { email: '' },
    mode: ValidationMode.OnSubmit,
    rules: {
      email: [rules.required('Email is required'), rules.email('Enter a valid email address')],
    },
    onSubmit: (values) => {
      void values
    },
  })

  return (
    <ExampleShell
      title="Email field"
      description="Live form using the public barrel. Required + email rules, accessible ids, submit, and reset."
    >
      <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
        <div className="demo-form__field">
          <label htmlFor={form.getFieldId('email')}>Email</label>
          <input {...form.register('email')} type="email" autoComplete="email" />
          {form.errors.email ? (
            <p id={form.getErrorId('email')} className="demo-form__error">
              {form.errors.email}
            </p>
          ) : null}
        </div>
        <div className="demo-form__actions">
          <button type="submit" disabled={form.isSubmitting}>
            Continue
          </button>
          <button
            type="button"
            className="demo-form__secondary"
            onClick={() => {
              form.reset()
            }}
            disabled={form.isSubmitting}
          >
            Reset
          </button>
        </div>
      </form>
      <StateInspector
        value={{
          values: form.values,
          errors: form.errors,
          touched: form.touched,
          dirtyFields: form.dirtyFields,
          isDirty: form.isDirty,
          isValid: form.isValid,
          isSubmitted: form.isSubmitted,
          submitCount: form.submitCount,
        }}
      />
    </ExampleShell>
  )
}

function GettingStartedPage() {
  return (
    <DocsPage>
      <Kicker>Setup</Kicker>
      <h1>Getting started</h1>
      <p className="docs-lead">
        Walk through install, a typed form, register, accessible errors, validation, submit, reset,
        and the extra entries. Snippets use the placeholder package name, not relative repo imports.
      </p>

      <Callout tone="info" title="Controls">
        <p>
          Storybook Controls are empty because this page is static documentation. The EmailField
          story is a live form with play coverage for required, invalid, and valid email.
        </p>
      </Callout>

      <Callout tone="warning" title="Install is a placeholder">
        <p>
          The library is not published. After the owner chooses a public name:{' '}
          <code>npm install {'<package-name>'}</code>. Peer: React 19. <code>react-dom</code> is an
          optional peer. Until then, develop from this repository.
        </p>
      </Callout>

      <CodePanel title="Install" code="npm install <package-name>" />

      <h2>First typed form</h2>
      <p>
        Infer values from <code>defaultValues</code>, or pass an explicit generic. Hooks are
        client-only. Import them from a Client Component in RSC apps.
      </p>
      <CodePanel title="useForm" code={snippets.basicUseForm} />

      <h2>Default values</h2>
      <p>
        <code>defaultValues</code> are required and deep-cloned on mount for plain objects. File,
        Date, and other atomic references are not deep-cloned. Async loads need the sync object plus{' '}
        <code>loadDefaultValues</code>.
      </p>

      <h2>Register native fields</h2>
      <p>
        <code>register(path)</code> returns <code>name</code>, <code>id</code>,{' '}
        <code>onChange</code>, <code>onBlur</code>, <code>ref</code>, and aria props. DOM{' '}
        <code>name</code> is the path string.
      </p>
      <CodePanel title="register" code={snippets.registration} />

      <h2>Accessible errors</h2>
      <p>
        Wire labels with <code>{`htmlFor={form.getFieldId('email')}`}</code>. Render the message on{' '}
        <code>{`id={form.getErrorId('email')}`}</code>. <code>register</code> sets{' '}
        <code>aria-invalid</code> and <code>aria-describedby</code>.
      </p>
      <CodePanel title="Label and error id" code={snippets.registration} />

      <h2>Validation rules</h2>
      <p>
        Prefer path-keyed <code>rules</code>. Built-ins skip empty values except required/accepted.
        Form-level <code>validate</code> overrides field messages for the same path. Resolvers are
        lowest precedence.
      </p>

      <h2>Submit and reset</h2>
      <p>
        <code>handleSubmit</code> validates, then calls <code>onSubmit</code>.{' '}
        <code>focusOnError</code> defaults to true. <code>reset()</code> restores cloned defaults
        and clears native file inputs. <code>resetField(path)</code> restores one leaf.
      </p>
      <CodePanel title="Submit and reset" code={snippets.submission} />

      <h2>Type inference</h2>
      <p>
        <code>register('address.city')</code> and <code>setValue('address.city', value)</code> check
        path and value types. <code>FieldPath</code> expansion stops at depth 5.
      </p>

      <h2>Validation modes</h2>
      <p>
        <code>ValidationMode.OnSubmit</code> (also used here), <code>OnBlur</code>, and{' '}
        <code>OnChange</code>. After submit, <code>reValidateMode</code> defaults to onChange.
        Manual <code>validate()</code> / <code>validateField(path)</code> always run.
      </p>
      <CodePanel title="Validation modes" code={snippets.validationModes} />

      <h2>useController</h2>
      <p>
        For custom controls whose API is a value. Optional <code>parse</code> / <code>format</code>{' '}
        map display to stored types. <code>disabled</code> is UI-only; the value still submits.
      </p>
      <CodePanel title="useController" code={snippets.controlledFields} />

      <h2>FormProvider</h2>
      <p>
        Pass only <code>form.control</code>, never the full <code>useForm</code> return. Child hooks
        fall back to the nearest provider. Explicit <code>control</code> still wins.
      </p>
      <CodePanel title="FormProvider" code={snippets.context} />

      <h2>Nested fields</h2>
      <p>
        Values stay nested. Errors, touched, and dirty maps use <code>'address.city'</code> keys.
      </p>
      <CodePanel title="Nested path" code={snippets.nestedFields} />

      <h2>Field arrays</h2>
      <p>
        One index level. Stable keys live outside form values. Wildcard item rules are not
        implemented; use form-level <code>validate</code> for dynamic items.
      </p>
      <CodePanel title="useFieldArray" code={snippets.fieldArrays} />

      <h2>Server errors</h2>
      <p>
        After client validation succeeds, map API failures with <code>helpers.setErrors</code> and{' '}
        <code>helpers.setSubmitError</code>. Pass <code>{"{ source: 'server' }"}</code> when the map
        came from the backend.
      </p>
      <CodePanel title="Submit helpers" code={snippets.backendErrors} />

      <h2>File inputs</h2>
      <p>
        Default <code>null</code> or <code>[]</code>. Register with <code>type: 'file'</code> (and{' '}
        <code>multiple: true</code> for <code>File[]</code>). State stores the File reference, not
        contents. Client file rules are UX only, not a security boundary.
      </p>
      <CodePanel title="File field" code={snippets.fileInputs} />

      <h2>Async validation</h2>
      <p>
        Ordinary async validators run immediately. Debounce remote checks with{' '}
        <code>rules.async</code>. Pending debounce is not counted in <code>isValidating</code>.
      </p>
      <CodePanel title="Debounced async rule" code={snippets.asyncValidation} />

      <h2>Schema resolver subpath</h2>
      <p>
        Not on the core barrel. The adapter does not depend on Zod, Yup, or Valibot. It has no React
        import and can run on the server.
      </p>
      <CodePanel title="Standard Schema" code={snippets.schemaResolver} />

      <h2>DevTools subpath</h2>
      <p>
        Development inspector only. Do not ship it as a production UI. Conditionally render or pass{' '}
        <code>{'enabled={false}'}</code>.
      </p>
      <CodePanel title="DevTools" code={snippets.devtools} />

      <h2>Next steps</h2>
      <FeatureList
        items={[
          {
            title: 'Hooks',
            body: 'useForm, useWatch, useFormState, useFieldState, useController, useFieldArray, useFormContext.',
          },
          {
            title: 'Components',
            body: 'FormProvider and FormDevTools (separate package entry).',
          },
          {
            title: 'Validation',
            body: 'Built-in rules, custom rules, async, dependencies, structured errors, i18n, resolvers.',
          },
          {
            title: 'Fields / Examples',
            body: 'Live Examples plus Core Concepts for register, modes, errors, submit, reset, getters, mutations, and normalizeErrors. Migration policy is under Migration.',
          },
        ]}
      />
      <GithubSourceLink path="src/examples/LoginForm.tsx" />
    </DocsPage>
  )
}

const meta = {
  title: 'Getting Started',
  component: GettingStartedPage,
  parameters: {
    layout: 'fullscreen',
    controls: {
      exclude: /./,
    },
    docs: {
      description: {
        component:
          'Install placeholder, React 19 peer, first typed form, register, accessible errors, validation, submit, reset, nested fields, arrays, files, resolvers, and DevTools. Controls are empty because the Overview is static documentation. EmailField is a live form with play coverage for required, invalid, and valid email.',
      },
      source: consumerDocsSource(snippets.basicUseForm),
    },
  },
} satisfies Meta<typeof GettingStartedPage>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {}

export const EmailField: Story = {
  render: () => <EmailFieldDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const submit = canvas.getByRole('button', { name: 'Continue' })
    await userEvent.click(submit)
    await expect(canvas.getByText('Email is required')).toBeVisible()

    await userEvent.type(canvas.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(submit)
    await expect(canvas.getByText('Enter a valid email address')).toBeVisible()

    await userEvent.clear(canvas.getByLabelText('Email'))
    await userEvent.type(canvas.getByLabelText('Email'), 'ada@example.com')
    await userEvent.click(submit)
    await expect(canvas.queryByText('Email is required')).not.toBeInTheDocument()
    await expect(canvas.queryByText('Enter a valid email address')).not.toBeInTheDocument()
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story:
          'Live email field from the public barrel: required and email rules, getFieldId/getErrorId, submit, and reset.',
      },
      source: consumerDocsSource(snippets.registration),
    },
  },
}
