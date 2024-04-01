/**
 * @file util form
 * @desc Helpers to deal with form validation
 */

import { type FormRules } from 'naive-ui'
import { useI18n, type LocaleMessage } from './i18n'

export type ValidationResult = LocaleMessage | null | undefined

export type ValidatorReturned = ValidationResult | Promise<ValidationResult>

export type Validator<V> = (v: V) => ValidatorReturned

export type FormRulesInput = {
  [path: string]: Validator<any>
}

export function useFormRules(input: FormRulesInput): FormRules {
  const { t } = useI18n()
  const rules: FormRules = {}
  Object.keys(input).forEach(path => {
    const validator = input[path]
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
  return rules
}

export function isPromiseLike(arg: any): arg is Promise<any> {
  return arg != null && typeof arg === 'object' && typeof arg.then === 'function'
}
