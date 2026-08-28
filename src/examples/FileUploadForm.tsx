import { useEffect, useMemo } from 'react'
import { rules, useForm, ValidationMode, type FieldErrors, type FieldRules } from '../hooks/useForm'
import './examples.css'

type UploadFormValues = {
  profile: {
    fullName: string
    avatar: File | null
  }
  documents: File[]
}

const uploadRules: FieldRules<UploadFormValues> = {
  'profile.fullName': [rules.required('Name is required')],
  'profile.avatar': [
    rules.required('Select a profile image'),
    rules.fileType(['image/jpeg', 'image/png'], 'Only JPEG and PNG images are allowed'),
    rules.fileExtension(['jpg', 'jpeg', 'png']),
    rules.fileSize(2 * 1024 * 1024, 'Image must not exceed 2 MB'),
    (file) => {
      if (!file) return undefined
      return file.name.includes(' ') ? 'Filename cannot contain spaces' : undefined
    },
  ],
  documents: [
    rules.minFiles(1, 'Upload at least one document'),
    rules.maxFiles(3, 'You can upload up to three documents'),
    rules.fileExtension(['pdf', 'doc', 'docx'], 'Unsupported document type'),
    rules.eachFile(rules.fileSize(5 * 1024 * 1024, 'Each document must be under 5 MB')),
  ],
}

function isUploadRejected(
  error: unknown,
): error is Error & { fieldErrors?: FieldErrors<UploadFormValues> } {
  return error instanceof Error && error.message === 'UPLOAD_REJECTED'
}

async function fakeUpload(values: UploadFormValues): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 300)
  })

  if (values.profile.avatar?.name.toLowerCase().includes('virus')) {
    const error = new Error('UPLOAD_REJECTED') as Error & {
      fieldErrors?: FieldErrors<UploadFormValues>
    }
    error.fieldErrors = {
      'profile.avatar': 'This file was rejected by the server.',
    }
    throw error
  }
}

export function FileUploadForm() {
  const form = useForm<UploadFormValues>({
    id: 'upload',
    defaultValues: {
      profile: { fullName: '', avatar: null },
      documents: [],
    },
    mode: ValidationMode.OnSubmit,
    rules: uploadRules,
    onSubmit: async (values, helpers) => {
      try {
        // Recommended multipart pattern (do not set Content-Type manually):
        // const data = new FormData()
        // data.append('fullName', values.profile.fullName)
        // if (values.profile.avatar) data.append('avatar', values.profile.avatar)
        // values.documents.forEach((file) => data.append('documents', file))
        await fakeUpload(values)
        helpers.setSubmitError(undefined)
      } catch (error) {
        if (isUploadRejected(error)) {
          if (error.fieldErrors) helpers.setErrors(error.fieldErrors)
          helpers.setSubmitError('Upload failed. Check the highlighted fields.')
          return
        }
        throw error
      }
    },
  })

  const avatar = form.values.profile.avatar
  const previewUrl = useMemo(() => {
    if (!avatar) return undefined
    return URL.createObjectURL(avatar)
  }, [avatar])

  useEffect(() => {
    if (!previewUrl) return
    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <form className="demo-form" onSubmit={form.handleSubmit} noValidate>
      <div className="demo-form__header">
        <h2>File upload</h2>
        <p>Nested avatar + multiple documents with client-side file rules.</p>
      </div>

      {form.submitError ? (
        <p className="demo-form__banner" role="alert">
          {form.submitError}
        </p>
      ) : null}

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('profile.fullName')}>Full name</label>
        <input {...form.register('profile.fullName')} type="text" autoComplete="name" />
        {form.errors['profile.fullName'] ? (
          <p id={form.getErrorId('profile.fullName')} className="demo-form__error" role="alert">
            {form.errors['profile.fullName']}
          </p>
        ) : null}
      </div>

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('profile.avatar')}>Profile image</label>
        <input
          {...form.register('profile.avatar', {
            type: 'file',
            accept: 'image/jpeg,image/png',
          })}
          type="file"
          accept="image/jpeg,image/png"
        />
        {previewUrl ? (
          <p className="demo-form__preview demo-form__hint">
            <img src={previewUrl} alt="" width={48} height={48} />
            <span>Selected preview</span>
          </p>
        ) : null}
        {form.errors['profile.avatar'] ? (
          <p id={form.getErrorId('profile.avatar')} className="demo-form__error" role="alert">
            {form.errors['profile.avatar']}
          </p>
        ) : null}
        <p className="demo-form__hint">
          Dirty avatar: <code>{form.dirtyFields['profile.avatar'] ? 'yes' : 'no'}</code>
        </p>
      </div>

      <div className="demo-form__field">
        <label htmlFor={form.getFieldId('documents')}>Documents</label>
        <input
          {...form.register('documents', {
            type: 'file',
            multiple: true,
            accept: '.pdf,.doc,.docx',
          })}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
        />
        {form.values.documents.length > 0 ? (
          <p className="demo-form__hint">
            Selected: {form.values.documents.map((file) => file.name).join(', ')}
          </p>
        ) : null}
        {form.errors.documents ? (
          <p id={form.getErrorId('documents')} className="demo-form__error" role="alert">
            {form.errors.documents}
          </p>
        ) : null}
      </div>

      <div className="demo-form__actions">
        <button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? 'Uploading…' : 'Upload'}
        </button>
        <button
          type="button"
          className="demo-form__secondary"
          onClick={() => form.resetField('profile.avatar')}
          disabled={form.isSubmitting}
        >
          Reset avatar
        </button>
        <button
          type="button"
          className="demo-form__secondary"
          onClick={() => form.reset()}
          disabled={form.isSubmitting}
        >
          Reset all
        </button>
      </div>

      <p className="demo-form__hint">
        Client-side file checks improve UX only — always re-validate on the server. Try a filename
        containing <code>virus</code> for a nested backend error.
      </p>
    </form>
  )
}
