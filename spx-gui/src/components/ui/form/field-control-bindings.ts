import { computed } from 'vue'
import { useMaybeFormFieldContext, type FormFieldValidationState } from './context'

/**
 * Attributes that concrete controls can bind directly onto their actual focusable element.
 * This keeps a11y/state wiring centralized instead of re-implementing it in each control.
 */
export type FieldControlBindings = {
  id?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: 'true'
}

const noop = () => {}

/**
 * Adapter for concrete controls (`UITextInput`, `UINumberInput`, `UISlider`, etc.).
 *
 * Inside a form field it exposes validation state + field event handlers.
 * Outside a form field it gracefully degrades to a standalone-control no-op mode.
 */
export function useFieldControlBindings() {
  const fieldCtx = useMaybeFormFieldContext()

  const validationState = computed<FormFieldValidationState>(() => fieldCtx?.validationState.value ?? 'default')
  const invalid = computed(() => fieldCtx?.invalid.value ?? false)
  const feedback = computed(() => fieldCtx?.feedback.value ?? null)

  // Keep the binding surface compact so controls can simply `v-bind="controlBindings"`.
  const controlBindings = computed<FieldControlBindings>(() => {
    if (fieldCtx == null) return {}
    return {
      id: fieldCtx.ids.controlId,
      'aria-labelledby': fieldCtx.labelledBy.value,
      'aria-describedby': fieldCtx.describedBy.value,
      'aria-invalid': fieldCtx.invalid.value ? 'true' : undefined
    }
  })

  return {
    validationState,
    invalid,
    feedback,
    controlBindings,
    onInput: fieldCtx?.onInput ?? noop,
    onChange: fieldCtx?.onChange ?? noop,
    onBlur: fieldCtx?.onBlur ?? noop,
    onCompositionStart: fieldCtx?.onCompositionStart ?? noop,
    onCompositionEnd: fieldCtx?.onCompositionEnd ?? noop
  }
}
