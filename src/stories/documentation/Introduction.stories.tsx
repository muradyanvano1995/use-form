import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ApiTable,
  Callout,
  CodePanel,
  DocsPage,
  FeatureList,
  GithubSourceLink,
  Kicker,
} from '../components/DocsUi.tsx'
import { consumerDocsSource } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

function IntroductionPage() {
  return (
    <DocsPage>
      <Kicker>Form hooks</Kicker>
      <h1>Typed React 19 form state</h1>
      <p className="docs-lead">
        A client-side form library for values, validation, nested paths, one-level field arrays,
        files, and submission. Storybook here is local documentation only. It is not packed, not
        deployed, and not an npm product page.
      </p>

      <Callout tone="info" title="Controls">
        <p>
          Storybook Controls are empty because this page is static documentation, not a component
          playground.
        </p>
      </Callout>

      <Callout tone="warning" title="Not published">
        <p>
          The workspace packages locally (<code>private: true</code>). The name in{' '}
          <code>package.json</code> is a generic placeholder. Consumer snippets use{' '}
          <code>{'<package-name>'}</code>. Do not treat this as a public npm identity, license, or
          production guarantee.
        </p>
      </Callout>

      <h2>Problem it solves</h2>
      <p>
        React forms need typed paths, validation that can mix field rules with schema resolvers, and
        accessible native bindings without a second state library. This hook owns values, errors,
        touched and dirty metadata, validation timing, and submit lifecycle for nested objects.
      </p>

      <h2>Maturity</h2>
      <p>
        Local ESM packaging exists (<code>dist/</code>, core / DevTools / Standard Schema entries,
        declaration files, consumer tests). React 19 is the only supported React line. There is no
        published registry package, no chosen license, and no claimed production SLA.
      </p>

      <h2>Capabilities</h2>
      <FeatureList
        items={[
          {
            title: 'Typed values and paths',
            body: 'FieldPath inference for nested objects and products.0.name arrays. Depth is capped at 5.',
          },
          {
            title: 'Native and controlled fields',
            body: 'register() for HTML controls. useController for value-based custom components.',
          },
          {
            title: 'Validation pipeline',
            body: 'Built-in rules, form-level validate, optional resolvers, async debounce, i18n catalogs.',
          },
          {
            title: 'Files without content',
            body: 'File | null and File[] stay as references. The library does not read file bytes into state.',
          },
          {
            title: 'Subscriptions and context',
            body: 'useWatch, useFormState, useFieldState, FormProvider, and a stable form.control handle.',
          },
          {
            title: 'DevTools on a side entry',
            body: 'Read-only inspector from <package-name>/devtools. It is not a core export.',
          },
        ]}
      />

      <h2>Design principles</h2>
      <ul>
        <li>React 19 client hooks. The Standard Schema adapter has no React import.</li>
        <li>
          ESM only. There is no tested CommonJS <code>require()</code> build.
        </li>
        <li>
          Prefer <code>rules</code> over ad-hoc field validators.
        </li>
        <li>
          Live state stays input-shaped. Transformed resolver output reaches <code>onSubmit</code>{' '}
          only after a successful cycle.
        </li>
        <li>
          String <code>errors</code> are a view of structured <code>errorDetails</code>.
        </li>
      </ul>

      <h2>Type safety</h2>
      <p>
        <code>useForm&lt;TInput, TOutput, TContext&gt;</code> types default values,{' '}
        <code>register</code>, <code>setValue</code>, rules, and submit output. Invalid paths and
        value types fail at compile time. Context generics are compile-time assertions, not runtime
        checks.
      </p>

      <h2>Controlled vs uncontrolled</h2>
      <p>
        Use <code>register(path)</code> for native <code>input</code>, <code>select</code>, and{' '}
        <code>textarea</code> (including file inputs). Use <code>useController</code> when the
        control speaks in values, not DOM events: date pickers, design-system selects, custom
        uploaders. <code>field.onChange(nextValue)</code> is a value, not an event.
      </p>

      <h2>Validation architecture</h2>
      <p>
        One client snapshot, sequential sources. Same-path messages from a later source override an
        earlier one. Lowest to highest:
      </p>
      <ol>
        <li>
          <code>resolver</code> (source <code>resolver</code>)
        </li>
        <li>
          Field <code>rules</code> / legacy <code>fieldValidators</code> (sources <code>rule</code>{' '}
          / <code>field</code>)
        </li>
        <li>
          Form-level <code>validate</code> (source <code>form</code>)
        </li>
      </ol>
      <p>
        Backend <code>setErrors</code> apply after a successful client pass (<code>manual</code> by
        default, or <code>server</code> when requested). Pathless schema issues become{' '}
        <code>rootError</code>, which is not <code>submitError</code>.
      </p>

      <h2>Nested paths and field arrays</h2>
      <p>
        Values stay nested. Metadata is keyed by dot paths such as <code>address.city</code>. Field
        arrays support one index level (<code>products.0.name</code>). Nested arrays inside items
        are unsupported. Wildcard paths such as <code>products.*.name</code> are not implemented.
      </p>

      <h2>Async defaults, debounce, and resolvers</h2>
      <p>
        Pass complete sync <code>defaultValues</code> plus optional <code>loadDefaultValues</code>.
        Expensive remote field checks use <code>{'rules.async(validator, { debounce })'}</code>.
        Schema libraries are not core dependencies; use <code>FormResolver</code> or{' '}
        <code>standardSchemaResolver</code> from the Standard Schema subpath.
      </p>

      <h2>Context, errors, i18n, files, batching</h2>
      <ul>
        <li>
          <code>{'FormProvider control={form.control}'}</code> plus subscription hooks.
        </li>
        <li>
          Structured errors: display <code>errors[path]</code>, inspect{' '}
          <code>errorDetails[path]</code>.
        </li>
        <li>
          Per-form <code>validationMessages</code> catalogs; missing keys fall back to English{' '}
          <code>defaultValidationMessages</code>.
        </li>
        <li>
          Conditional fields: default <code>shouldUnregister: false</code> preserves values.
        </li>
        <li>File registration is uncontrolled (no value/checked). Contents are not stored.</li>
        <li>
          <code>form.batch()</code> defers notifications. Getters such as <code>getValues</code> are
          non-reactive.
        </li>
      </ul>

      <h2>DevTools and SSR</h2>
      <p>
        Import <code>FormDevTools</code> only from <code>{'<package-name>/devtools'}</code>. Form
        hooks are client APIs (<code>'use client'</code>) and cannot run in Server Components. The
        resolver entry has no client directive and may be used on the server.
      </p>

      <h2>Current limitations</h2>
      <ul>
        <li>Not published. React Native is unsupported. ESM only, no CJS.</li>
        <li>Path expansion depth 5. One-level arrays. No nested arrays. No wildcard paths.</li>
        <li>No first-party Zod/Yup/Valibot adapter. No production DevTools.</li>
      </ul>

      <h2>When to use</h2>
      <p>
        Typed React 19 web forms that need nested objects, one-level arrays, accessible native
        fields, optional schema validation, or file metadata without reading contents.
      </p>
      <h2>When not to use</h2>
      <p>
        React 18 apps, React Native, CommonJS bundlers that need <code>require()</code>, deeply
        nested array trees, or a published npm dependency today. Continue from Getting Started, then
        Validation, Fields, State and Performance, Tools, Accessibility, API overview, and
        Limitations and roadmap.
      </p>

      <ApiTable
        rows={[
          {
            name: 'Getting Started',
            kind: 'docs',
            notes: 'Install placeholder, first typed form, register, modes, context, files.',
          },
          {
            name: 'API overview',
            kind: 'docs',
            notes: 'Core exports vs DevTools and Standard Schema subpaths.',
          },
          {
            name: 'Limitations and roadmap',
            kind: 'docs',
            notes: 'Honest unsupported surfaces and owner release blockers.',
          },
        ]}
      />

      <h2>Minimal example</h2>
      <CodePanel title="Client form" code={snippets.basicUseForm} />
      <GithubSourceLink path="src/examples/LoginForm.tsx" />
    </DocsPage>
  )
}

const meta = {
  title: 'Introduction',
  component: IntroductionPage,
  parameters: {
    layout: 'fullscreen',
    controls: {
      exclude: /./,
    },
    docs: {
      description: {
        component:
          'Landing page for this local form-hooks library: purpose, React 19 and ESM-only maturity, capabilities, validation precedence, and current limits. Storybook Controls are empty because the page is static documentation.',
      },
      source: consumerDocsSource(snippets.basicUseForm),
    },
  },
} satisfies Meta<typeof IntroductionPage>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = {}
