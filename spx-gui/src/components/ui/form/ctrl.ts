import { reactive } from 'vue'

export type FormValidationResult = string | null | undefined

export type FormValidatorReturned = FormValidationResult | Promise<FormValidationResult>

export type FormValidator<V> = (v: V) => FormValidatorReturned

export type FormValidated = { hasError: false } | { hasError: true; error: string }

export type FormCtrl<V = { [p: string]: unknown }> = {
  value: V
  validate: () => Promise<FormValidated>
  validateWithPath: (p: keyof V) => Promise<FormValidated>
  validated: { [p in keyof V]?: FormValidated }
}

// TODO: better type definition for better type-safety
export function useForm<V extends { [p: string]: unknown }>(input: {
  [p in keyof V]: [initialValue: V[p], validator?: FormValidator<V[p]>]
}): FormCtrl<V> {
  // TODO: For more complex form, consider implementing [formstate-x](https://github.com/qiniu/formstate-x) in vue
  const paths = Object.keys(input) as Array<keyof V>
  const formValue = reactive({}) as V
  const formValidators = {} as { [p in keyof V]?: FormValidator<V[p]> }
  const formValidated = reactive({}) as { [p in keyof V]?: FormValidated }

  for (const path of paths) {
    const [initialValue, validator] = input[path]
    formValue[path] = initialValue
    formValidators[path] = validator
  }

  async function validateWithPath(path: keyof V): Promise<FormValidated> {
    const result = await formValidators[path]?.(formValue[path])
    return (formValidated[path] = result ? { hasError: true, error: result } : { hasError: false })
  }

  async function validate(): Promise<FormValidated> {
    const validatedList = await Promise.all(paths.map((path) => validateWithPath(path)))
    for (const validated of validatedList) {
      if (validated.hasError) return validated
    }
    return { hasError: false }
  }

  return {
    value: formValue,
    validate,
    validateWithPath,
    validated: formValidated
  }
}
