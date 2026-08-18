export type DemoFormProps = {
  disabled?: boolean
}

export type DemoSubmitHandlers<TSuccess> = {
  onSubmitSuccess?: (payload: TSuccess) => void
  onSubmitInvalid?: (info: { fieldCount: number }) => void
  onReset?: () => void
}
