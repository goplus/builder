import { reactive, ref, type Ref } from 'vue'
import type { FormRules, FormInst, FormValidationError } from 'naive-ui'

export type FormValidationResult = string | null | undefined

export type FormValidatorReturned = FormValidationResult | Promise<FormValidationResult>

export type FormValidator<V> = (v: V) => FormValidatorReturned

export type FormValidated = { hasError: boolean }

export type FormCtrl<V = { [p: string]: unknown }> = {
  _nFormRef: Ref<FormInst | null>
  _nFormRules: FormRules
  value: V
  validate: () => Promise<FormValidated>
}

// TODO: better type definition for better type-safety
export function useForm<V extends { [p: string]: unknown }>(input: {
  [p in keyof V]: [initialValue: V[p], validator?: FormValidator<V[p]>]
}): FormCtrl<V> {
  const formRef = ref<FormInst | null>(null)

  const formValue = reactive({}) as V
  const formRules: FormRules = {}
  ;(Object.keys(input) as Array<keyof V>).forEach((path) => {
    const [initialValue, validator] = input[path]
    formValue[path] = initialValue
    formRules[path as string] = {
      async validator(_: unknown, v: V[typeof path]) {
        if (validator == null) return
        const result = await validator(v)
        if (result == null) return
        throw new Error(result)
      },
      trigger: ['input', 'blur'] // TODO: we need to define our own trigger logic
    }
  })

  async function validate(): Promise<FormValidated> {
    if (formRef.value == null) throw new Error('invalid calling of validate without formRef value')
    const errs: FormValidationError[] = await formRef.value.validate().then(
      () => [],
      (e) => {
        if (Array.isArray(e)) return e
        throw e
      }
    )
    return { hasError: errs.length > 0 }
  }

  return {
    _nFormRef: formRef,
    _nFormRules: formRules,
    value: formValue,
    validate
  }
}
