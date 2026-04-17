import { reactive } from 'vue'

/** Validator return shape used across the current lightweight form store. */
export type FormValidationResult = string | null | undefined

export type FormValidatorReturned = FormValidationResult | Promise<FormValidationResult>

export type FormValidator<V> = (v: V) => FormValidatorReturned

export type FormValidated = { hasError: false } | { hasError: true; error: string }

/**
 * We currently only support first-level form fields in `useForm(...)`.
 * Keeping the path type narrow helps the rest of the form layer avoid `string | number | symbol` noise.
 */
export type FormPath<V> = Extract<keyof V, string>

export type FormCtrl<V = { [p: string]: unknown }> = {
  value: V
  validate: () => Promise<FormValidated>
  /** Preferred long-term API for validating a single field. */
  validateField: (p: FormPath<V>) => Promise<FormValidated>
  /** Compatibility alias kept during the migration away from the old naming. */
  validateWithPath: (p: FormPath<V>) => Promise<FormValidated>
  validated: Partial<Record<FormPath<V>, FormValidated>>
}

/**
 * Minimal form store used by the current UI layer.
 *
 * Intentionally kept small: it owns values, validators, and latest validation results,
 * while interaction timing (debounce, blur delay, IME composition) lives in the field layer.
 */
export function useForm<V extends { [p: string]: unknown }>(input: {
  [p in keyof V]: [initialValue: V[p], validator?: FormValidator<V[p]>]
}): FormCtrl<V> {
  // TODO: For more complex form, consider implementing [formstate-x](https://github.com/qiniu/formstate-x) in vue
  const paths = Object.keys(input) as Array<FormPath<V>>
  const formValue = reactive({}) as V
  const formValidators = {} as Partial<{ [p in FormPath<V>]: FormValidator<V[p]> }>
  const formValidated = reactive({}) as Partial<Record<FormPath<V>, FormValidated>>

  for (const path of paths) {
    const [initialValue, validator] = input[path]
    formValue[path] = initialValue
    formValidators[path] = validator
  }

  /** Validate only the requested field and cache the latest result back into `validated`. */
  async function validateField(path: FormPath<V>): Promise<FormValidated> {
    const result = await formValidators[path]?.(formValue[path])
    return (formValidated[path] = result ? { hasError: true, error: result } : { hasError: false })
  }

  async function validateWithPath(path: FormPath<V>): Promise<FormValidated> {
    return validateField(path)
  }

  async function validate(): Promise<FormValidated> {
    const validatedList = await Promise.all(paths.map((path) => validateField(path)))
    for (const validated of validatedList) {
      if (validated.hasError) return validated
    }
    return { hasError: false }
  }

  return {
    value: formValue,
    validate,
    validateField,
    validateWithPath,
    validated: formValidated
  }
}
