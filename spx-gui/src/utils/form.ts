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

export type FormRulesInput = {
  [path: string]: Validator<any>
}

export function useForm(rulesInput: FormRulesInput) {
  const { t } = useI18n()

  const formRef = ref<FormInst | null>(null)

  const rules: FormRules = {}
  Object.keys(rulesInput).forEach(path => {
    const validator = rulesInput[path]
    rules[path] = {
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
      e => {
        if (Array.isArray(e)) return e
        throw e
      }
    )
    return errs
  }

  return [formRef, rules, validate] as const
}

export function isPromiseLike(arg: any): arg is Promise<any> {
  return arg != null && typeof arg === 'object' && typeof arg.then === 'function'
}
