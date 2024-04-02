/**
 * @file util form
 * @desc Helpers to deal with form validation
 */

import { ref } from 'vue'
import type { FormRules, FormInst, FormValidationError } from 'naive-ui'
import { useI18n, type LocaleMessage } from './i18n'

export type ValidationResult = LocaleMessage | null | undefined

export type ValidatorReturned = ValidationResult | Promise<ValidationResult>

export type Validator<V> = (v: V) => ValidatorReturned

export type FormInput = {
  [path: string]: [initialValue: unknown, validator: Validator<any>]
}

// TODO: better type definition for better type-safety
export function useForm(input: FormInput) {
  const { t } = useI18n()

  const formRef = ref<FormInst | null>(null)

  const formValue = ref<{ [path: string]: any }>({})
  const formRules: FormRules = {}
  Object.keys(input).forEach((path) => {
    const [initialValue, validator] = input[path]
    formValue.value[path] = initialValue
    formRules[path] = {
      async validator(_: unknown, v: unknown) {
        const result = await validator(v)
        if (result == null) return
        const errText = t(result)
        throw new Error(errText)
      },
      trigger: ['input', 'blur'] // TODO: we need to define our own trigger logic
    }
  })

  async function validate() {
    if (formRef.value == null) throw new Error('invalid calling of validate without formRef value')
    const errs: FormValidationError[] = await formRef.value.validate().then(
      () => [],
      (e) => {
        if (Array.isArray(e)) return e
        throw e
      }
    )
    return errs
  }

  // for NForm v-bind
  const binds = {
    // TODO: model in binds, to avoid `:model="formValue"`
    ref: formRef,
    rules: formRules
  }

  return [binds, formValue, validate] as const
}
