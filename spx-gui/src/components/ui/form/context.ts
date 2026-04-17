import { inject, type ComputedRef, type InjectionKey } from 'vue'
import type { FormCtrl } from './ctrl'

/** Shared context provided by `UIForm` to every descendant form field. */
export type FormContext<V = Record<string, unknown>> = {
  form: FormCtrl<V>
  hasSuccessFeedback: boolean
}

export const formContextKey: InjectionKey<FormContext> = Symbol('ui-form')

export function useFormContext() {
  const ctx = inject(formContextKey)
  if (ctx == null) throw new Error('useFormContext should be called inside of UIForm')
  return ctx
}

/**
 * Validation state intentionally stays small for now.
 * Disabled / readonly / focus remain control concerns instead of field-validation concerns.
 */
export type FormFieldValidationState = 'default' | 'error' | 'success'

/** Field-level events that can trigger validation in the current architecture. */
export type FormFieldValidateTrigger = 'input' | 'change' | 'blur'

/**
 * Interaction timing lives at the field layer so `ctrl.ts` can stay focused on data + validation.
 */
export type FormFieldConfig = {
  validateOn: ReadonlyArray<FormFieldValidateTrigger>
  inputDebounce: number
  blurDelay: number
}

export const defaultFormFieldConfig: FormFieldConfig = {
  validateOn: ['input', 'change', 'blur'],
  inputDebounce: 300,
  blurDelay: 200
}

/** Stable ids shared by item layout and the actual control for a11y wiring. */
export type FormFieldIds = {
  labelId: string
  controlId: string
  tipId: string
  errorId: string
}

/**
 * Internal field contract consumed by `useFormControl()`.
 *
 * It deliberately does not own the field value yet — business code still binds values through
 * `v-model:value="form.value.xxx"`, while the field layer owns validation state and timing.
 */
export type FormFieldContext = {
  path?: string
  ids: FormFieldIds
  validationState: ComputedRef<FormFieldValidationState>
  feedback: ComputedRef<string | null>
  invalid: ComputedRef<boolean>
  describedBy: ComputedRef<string | undefined>
  labelledBy: ComputedRef<string | undefined>
  onInput: () => void
  onChange: () => void
  onBlur: () => void
  onCompositionStart: () => void
  onCompositionEnd: () => void
}

export const formFieldContextKey: InjectionKey<FormFieldContext> = Symbol('ui-form-field')

/** Optional accessor used by controls so they can still work outside a form item. */
export function useMaybeFormFieldContext() {
  return inject(formFieldContextKey, null)
}
