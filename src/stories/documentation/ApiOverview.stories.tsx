import type { Meta, StoryObj } from '@storybook/react-vite'
import { ApiTable, Callout, CodePanel, DocsPage, Kicker } from '../components/DocsUi.tsx'

function ApiOverviewPage() {
  return (
    <DocsPage>
      <Kicker>Public surface</Kicker>
      <h1>API overview</h1>
      <p className="docs-lead">
        Runtime exports from the core entry, plus the two subpaths that are intentionally absent
        from that barrel. Inventory source: <code>docs/public-api.md</code>. Package identity is not
        final; snippets use <code>{'<package-name>'}</code>.
      </p>

      <Callout tone="info" title="Controls">
        <p>
          Storybook Controls are empty because this page is static documentation, not a component
          playground.
        </p>
      </Callout>

      <Callout tone="warning" title="Not on core">
        <p>
          <code>FormDevTools</code> and <code>standardSchemaResolver</code> are not core exports.
          Import them from their subpaths. Internal store constructors, serializers, and path
          parsers must not be imported.
        </p>
      </Callout>

      <h2>Core runtime</h2>
      <p>
        Import from <code>{'<package-name>'}</code>. This entry preserves <code>'use client'</code>.
      </p>
      <ApiTable
        rows={[
          {
            name: 'useForm',
            kind: 'hook',
            notes: 'Typed values, validation, submit, register, reset, batch, getters.',
          },
          {
            name: 'useWatch',
            kind: 'hook',
            notes: 'Subscribe to one path or all values. Re-renders on Object.is changes.',
          },
          {
            name: 'useFormState',
            kind: 'hook',
            notes: 'Selector over form snapshot. Optional custom isEqual.',
          },
          {
            name: 'useFieldState',
            kind: 'hook',
            notes: 'error, invalid, touched, dirty, and field-level validating flag.',
          },
          {
            name: 'useController',
            kind: 'hook',
            notes: 'Value-based bindings for custom controls. Prefer register for native inputs.',
          },
          {
            name: 'useFieldArray',
            kind: 'hook',
            notes: 'One-level dynamic lists. Stable keys stay outside form values.',
          },
          {
            name: 'FormProvider',
            kind: 'component',
            notes: 'Pass form.control only. Children can omit explicit control.',
          },
          {
            name: 'useFormContext',
            kind: 'hook',
            notes: 'Nearest FormControl. Missing provider throws a named error.',
          },
          {
            name: 'rules',
            kind: 'validation helpers',
            notes: 'Built-in required, email, length, files, async debounce, and combinators.',
          },
          {
            name: 'createRule',
            kind: 'validation helper',
            notes: 'Annotate a custom sync/async field rule with metadata.',
          },
          {
            name: 'createAsyncRule',
            kind: 'validation helper',
            notes: 'Build a debounced or immediate async rule with typed options.',
          },
          {
            name: 'ValidationMode',
            kind: 'const object',
            notes: 'onSubmit | onBlur | onChange. String literals remain valid.',
          },
          {
            name: 'ReValidateMode',
            kind: 'const object',
            notes: 'After submit: onChange (default), onBlur, or onSubmit.',
          },
          {
            name: 'CriteriaMode',
            kind: 'const object',
            notes: 'firstError (default) or all issues per field.',
          },
          {
            name: 'ErrorSource',
            kind: 'const object',
            notes: 'rule, field, form, resolver, server, manual.',
          },
          {
            name: 'normalizeErrors',
            kind: 'helper',
            notes: 'Drop empty strings and unsafe path segments from error maps.',
          },
          {
            name: 'defaultValidationMessages',
            kind: 'i18n catalog',
            notes: 'Frozen English built-in messages. Spread; do not mutate.',
          },
        ]}
      />

      <h2>Core types</h2>
      <p>
        Stable public types include <code>UseFormReturn</code>, <code>FormControl</code>,{' '}
        <code>FormResolver</code>, <code>FieldPath</code>, <code>FieldArrayPath</code>,{' '}
        <code>FieldError</code>, <code>FieldErrorDetails</code>, <code>DeepPartial</code>, and the
        option/return types for controller, array, watch, and unregister APIs. Experimental core
        exports: none.
      </p>

      <h2>Subpaths</h2>
      <ApiTable
        rows={[
          {
            name: '<package-name>',
            kind: 'core',
            notes: 'Client form APIs listed above. ESM import only.',
          },
          {
            name: '<package-name>/devtools',
            kind: 'DevTools-only',
            notes:
              'FormDevTools. Types: FormDevToolsProps, DevToolsPosition, DevToolsRedactionPredicate.',
          },
          {
            name: '<package-name>/resolvers/standard-schema',
            kind: 'Resolver-entry-only',
            notes:
              'standardSchemaResolver plus StandardSchemaV1* types. No React, no Zod/Yup/Valibot.',
          },
        ]}
      />

      <CodePanel
        title="Entries"
        code={`import { useForm, rules, ValidationMode } from '<package-name>'
import { FormDevTools } from '<package-name>/devtools'
import { standardSchemaResolver } from '<package-name>/resolvers/standard-schema'`}
      />

      <h2>Intentionally internal</h2>
      <p>
        Do not import <code>createFormStore</code>, <code>getControlInternals</code>,{' '}
        <code>safeSerialize</code>, <code>fieldErrorFromIssues</code>, field-array key stores, or
        path parsers. Declarations that mention internal types still must not make those types
        importable.
      </p>
    </DocsPage>
  )
}

const meta = {
  title: 'API overview',
  component: ApiOverviewPage,
  parameters: {
    layout: 'fullscreen',
    controls: {
      exclude: /./,
    },
    docs: {
      description: {
        component:
          'Table of public core exports from docs/public-api.md, plus DevTools and Standard Schema subpaths that are not on the core barrel. Controls are empty because this page is static documentation.',
      },
    },
  },
} satisfies Meta<typeof ApiOverviewPage>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {}
