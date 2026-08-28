import type { Meta, StoryObj } from '@storybook/react-vite'
import { RegistrationForm } from '../../examples/RegistrationForm.tsx'
import { ApiTable, Callout, CodePanel, DocsPage, Kicker } from '../components/DocsUi.tsx'
import { consumerDocsSource, withGithubExample } from '../preview/docsSource.ts'
import { snippets } from '../snippets/consumerSnippets.ts'

const builtInRuleRows = [
  {
    name: 'rules.required()',
    kind: 'presence',
    notes: 'Fails when the value is empty (null, undefined, "", or []). Does not skip empty.',
  },
  {
    name: 'rules.email()',
    kind: 'string',
    notes: 'Basic email pattern. Skips empty values so the field can stay optional.',
  },
  {
    name: 'rules.minLength(n)',
    kind: 'string',
    notes: 'String length ≥ n. Skips empty. Params: { min }.',
  },
  {
    name: 'rules.maxLength(n)',
    kind: 'string',
    notes: 'String length ≤ n. Skips empty. Params: { max }.',
  },
  {
    name: 'rules.length(n)',
    kind: 'string',
    notes: 'Exact string length. Skips empty. Params: { length }.',
  },
  {
    name: 'rules.min(n)',
    kind: 'number',
    notes: 'Finite number ≥ n. Skips empty. Params: { min }.',
  },
  {
    name: 'rules.max(n)',
    kind: 'number',
    notes: 'Finite number ≤ n. Skips empty. Params: { max }.',
  },
  {
    name: 'rules.pattern(regexp)',
    kind: 'string',
    notes: 'RegExp test. Skips empty. Params store source/flags only (not the value).',
  },
  {
    name: 'rules.accepted()',
    kind: 'boolean',
    notes: 'Value must be truthy (checkbox/terms). Does not skip false.',
  },
  {
    name: 'rules.sameAs(expected)',
    kind: 'compare',
    notes: 'Object.is against a constant. Skips empty. Expected value is never stored in params.',
  },
  {
    name: 'rules.matchesField(path)',
    kind: 'compare',
    notes:
      'Object.is against another field path (nested paths ok). Skips empty. Params: { field }.',
  },
  {
    name: 'rules.minItems(n)',
    kind: 'array',
    notes:
      'Array length ≥ n (field arrays). Does not skip empty — use for required lists. Params: { min }.',
  },
  {
    name: 'rules.maxItems(n)',
    kind: 'array',
    notes: 'Array length ≤ n. Skips empty. Params: { max }.',
  },
  {
    name: 'rules.fileSize(maxBytes)',
    kind: 'file',
    notes:
      'Every File must be ≤ maxBytes. Accepts File | null | File[]. Skips null/[]. Params: { maxBytes }.',
  },
  {
    name: 'rules.fileType(mimes)',
    kind: 'file',
    notes:
      'Every File.type must be in the allow-list (case-insensitive). Empty MIME fails. Not a security boundary.',
  },
  {
    name: 'rules.fileExtension(exts)',
    kind: 'file',
    notes:
      'Last path segment extension; optional leading dots; case-insensitive. Not a security boundary.',
  },
  {
    name: 'rules.minFiles(n)',
    kind: 'file',
    notes:
      'File[] length ≥ n. Does not skip empty — use for required multi-upload. Params: { min }.',
  },
  {
    name: 'rules.maxFiles(n)',
    kind: 'file',
    notes: 'File[] length ≤ n. Skips empty. Params: { max }.',
  },
] as const

const combinatorRows = [
  {
    name: 'rules.async(validator, options?)',
    kind: 'async',
    notes:
      'Debounced or immediate remote checks. Options: debounce, validateEmpty, type. Ordinary async validators without this helper stay immediate. See docs/async-validation.md.',
  },
  {
    name: 'rules.eachFile(rule)',
    kind: 'combinator',
    notes:
      'Runs an inner File rule per selected file. criteriaMode all collects issues with fileIndex. Skips null/[].',
  },
  {
    name: 'rules.custom(validator)',
    kind: 'escape hatch',
    notes:
      'Pass-through for an existing ValidationRule. Prefer createRule when you want annotated metadata.',
  },
  {
    name: 'createRule(validator)',
    kind: 'helper',
    notes:
      'Build a reusable sync/async rule with metadata. Not a member of rules, but the usual custom-rule entry. See Validation/Custom rules.',
  },
] as const

function BuiltInRulesCatalogPage() {
  return (
    <DocsPage>
      <Kicker>Validation</Kicker>
      <h1>Built-in rules</h1>
      <p className="docs-lead">
        Complete inventory of <code>rules.*</code> helpers exported from the core package. Compose
        them as arrays on <code>useForm(&#123; rules &#125;)</code>. Optional custom messages are
        strings or factories; missing keys fall back to English{' '}
        <code>defaultValidationMessages</code>.
      </p>

      <Callout tone="info" title="Empty values">
        <p>
          Most rules skip empty values so optional fields stay optional. Exceptions that always run:{' '}
          <code>required</code>, <code>accepted</code>, <code>minItems</code>, and{' '}
          <code>minFiles</code>. Empty means <code>null</code>, <code>undefined</code>,{' '}
          <code>&quot;&quot;</code>, or <code>[]</code>.
        </p>
      </Callout>

      <Callout tone="warning" title="Client-side only">
        <p>
          File type, extension, and size checks improve UX only. Always re-validate type, size,
          content, and authorization on the server.
        </p>
      </Callout>

      <h2>Catalog</h2>
      <ApiTable rows={[...builtInRuleRows]} />

      <h2>Async, combinators, and custom</h2>
      <ApiTable rows={[...combinatorRows]} />

      <h2>Usage</h2>
      <CodePanel title="Compose built-in rules" code={snippets.builtInRules} />

      <h2>Related</h2>
      <ul>
        <li>
          Live form demo: the <code>Live example</code> story on this page (registration subset).
        </li>
        <li>
          Custom rules: <code>Validation/Custom rules</code> (<code>createRule</code>).
        </li>
        <li>
          Message catalogs: <code>Validation/Internationalization</code>.
        </li>
        <li>
          Structured issues: <code>Validation/Structured errors</code> (<code>criteriaMode</code>).
        </li>
      </ul>
    </DocsPage>
  )
}

const meta = {
  title: 'Validation/Built-in rules',
  component: BuiltInRulesCatalogPage,
  parameters: {
    layout: 'fullscreen',
    controls: {
      exclude: /./,
    },
    docs: {
      description: {
        component: withGithubExample(
          'Full catalog of rules.* helpers: presence, string/number, compare, arrays, files, async, and combinators. Live registration demo is the Live example story.',
          'RegistrationForm.tsx',
        ),
      },
      source: consumerDocsSource(snippets.builtInRules),
    },
    a11y: { test: 'todo' },
  },
} satisfies Meta<typeof BuiltInRulesCatalogPage>

export default meta
type Story = StoryObj<typeof meta>

export const Catalog: Story = {}

export const LiveExample: Story = {
  render: () => <RegistrationForm />,
  parameters: {
    layout: 'padded',
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Registration form using required, email, minLength, min, accepted, matchesField, plus a createRule on the name field.',
      },
    },
  },
}
