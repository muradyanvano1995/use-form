import { useState } from 'react'
import {
  rules,
  useForm,
  ValidationMode,
  type FieldLabels,
  type ValidationMessageCatalog,
} from '../hooks/useForm'
import './examples.css'

type RegistrationValues = {
  name: string
  email: string
  password: string
  age: number
}

const defaultValues: RegistrationValues = {
  name: '',
  email: '',
  password: '',
  age: 16,
}

const englishLabels: FieldLabels<RegistrationValues> = {
  name: 'Full name',
  email: 'Email address',
  password: 'Password',
  age: 'Age',
}

const armenianLabels: FieldLabels<RegistrationValues> = {
  name: 'Անուն',
  email: 'Էլ․ հասցե',
  password: 'Գաղտնաբառ',
  age: 'Տարիք',
}

const englishMessages = {
  required: ({ label }) => `${label} is required`,
  email: ({ label }) => `${label} must be a valid email`,
  minLength: ({ label, params }) => `${label} must contain at least ${params.min} characters`,
  min: ({ label, params }) => `${label} must be at least ${params.min}`,
} satisfies ValidationMessageCatalog<RegistrationValues>

const armenianMessages = {
  required: ({ label }) => `${label} դաշտը պարտադիր է`,
  email: ({ label }) => `${label} դաշտում նշեք վավեր էլ․ հասցե`,
  minLength: ({ label, params }) => `${label} դաշտը պետք է պարունակի առնվազն ${params.min} նիշ`,
  min: ({ label, params }) => `${label} դաշտը պետք է լինի առնվազն ${params.min}`,
} satisfies ValidationMessageCatalog<RegistrationValues>

type Locale = 'en' | 'hy'

export type LocalizedRegistrationFormProps = {
  locale?: Locale
  onLocaleChange?: (locale: Locale) => void
}

export function LocalizedRegistrationForm({
  locale: localeProp,
  onLocaleChange,
}: LocalizedRegistrationFormProps = {}) {
  const [internalLocale, setInternalLocale] = useState<Locale>(localeProp ?? 'en')
  const locale = localeProp ?? internalLocale
  const [statusMessage, setStatusMessage] = useState<string | undefined>()

  const form = useForm<RegistrationValues>({
    id: 'localized-registration',
    defaultValues,
    criteriaMode: 'all',
    mode: ValidationMode.OnSubmit,
    fieldLabels: locale === 'hy' ? armenianLabels : englishLabels,
    validationMessages: locale === 'hy' ? armenianMessages : englishMessages,
    rules: {
      name: [rules.required(), rules.minLength(2)],
      email: [rules.required(), rules.email()],
      password: [
        rules.required(),
        rules.minLength(8, ({ label, params }) =>
          locale === 'hy'
            ? `${label}՝ առնվազն ${params.min} նիշ (կանոնի հաղորդագրություն)`
            : `${label}: use at least ${params.min} characters (per-rule override)`,
        ),
      ],
      age: [rules.min(18)],
    },
    onSubmit: () => {
      setStatusMessage(locale === 'hy' ? 'Գրանցումն ընդունվեց։' : 'Registration accepted.')
    },
  })

  const passwordIssues = form.errorDetails.password?.issues ?? []
  const passwordErrorId = form.getErrorId('password')

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <header className="demo-form__header">
        <h2>Localized registration</h2>
        <p>
          Form-level message catalogs and field labels. Switching locale does not change existing
          errors until you validate again. No translation library is required.
        </p>
      </header>

      <fieldset className="demo-form__field">
        <legend>Language</legend>
        <label>
          <input
            type="radio"
            name="localized-locale"
            checked={locale === 'en'}
            onChange={() => {
              setInternalLocale('en')
              onLocaleChange?.('en')
            }}
          />
          English
        </label>
        <label>
          <input
            type="radio"
            name="localized-locale"
            checked={locale === 'hy'}
            onChange={() => {
              setInternalLocale('hy')
              onLocaleChange?.('hy')
            }}
          />
          Հայերեն
        </label>
      </fieldset>

      <label className="demo-form__field">
        {locale === 'hy' ? armenianLabels.name : englishLabels.name}
        <input {...form.register('name')} autoComplete="name" />
        {form.errors.name ? <p className="demo-form__error">{form.errors.name}</p> : null}
      </label>

      <label className="demo-form__field">
        {locale === 'hy' ? armenianLabels.email : englishLabels.email}
        <input {...form.register('email')} type="email" autoComplete="email" />
        {form.errors.email ? <p className="demo-form__error">{form.errors.email}</p> : null}
      </label>

      <label className="demo-form__field">
        {locale === 'hy' ? armenianLabels.password : englishLabels.password}
        <input
          {...form.register('password')}
          type="password"
          autoComplete="new-password"
          aria-describedby={passwordIssues.length > 0 ? passwordErrorId : undefined}
        />
        {passwordIssues.length > 0 ? (
          <ul id={passwordErrorId} className="demo-form__error">
            {passwordIssues.map((issue) => (
              <li key={`${issue.type}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
      </label>

      <label className="demo-form__field">
        {locale === 'hy' ? armenianLabels.age : englishLabels.age}
        <input {...form.register('age')} type="number" />
        {form.errors.age ? <p className="demo-form__error">{form.errors.age}</p> : null}
      </label>

      {statusMessage ? <p className="demo-form__status">{statusMessage}</p> : null}

      <div className="demo-form__actions">
        <button type="submit" disabled={form.isSubmitting}>
          {locale === 'hy' ? 'Ստուգել և ուղարկել' : 'Validate and submit'}
        </button>
        <button
          type="button"
          onClick={() => {
            void form.validate()
          }}
        >
          {locale === 'hy' ? 'Վերավավերացնել' : 'Revalidate'}
        </button>
      </div>
    </form>
  )
}
