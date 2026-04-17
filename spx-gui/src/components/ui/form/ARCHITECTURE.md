# Form Architecture

Design notes for the internal form/input architecture used to replace the remaining `naive-ui` form primitives in XBuilder.

This document is intentionally implementation-oriented. It captures the current agreed direction for issue `#3017` and should be treated as the working contract for follow-up implementation.

## Background

The current form/input layer is mid-migration away from `naive-ui`:

- `UIForm` and `UIFormItem` now own native/internal form orchestration instead of wrapping `NForm` / `NFormItem`
- `UIFormItemInternal` has been removed
- `UISwitch`, `UICheckbox`, `UICheckboxGroup`, `UIRadio`, and `UIRadioGroup` still wrap `naive-ui` primitives
- some remaining choice-control and business-side code still relies on third-party or legacy DOM/class details (for example `UISwitch`, `UICheckbox`, `UICheckboxGroup`, `UIRadio`, `UIRadioGroup`, and business-side selectors such as `.n-radio--checked` in `xgo-code-editor/ui/input-helper/BooleanInput.vue`)

The long-term goal is not only to remove those imports, but to establish an internal form/control contract that future UI components can build on without depending on third-party DOM or implementation details.

---

## Scope

This architecture is for the form/input portion of issue `#3017`.

It covers:

- form store and validation execution
- form context and field context
- field-level control integration
- `UIForm` / `UIFormItem` responsibilities
- how concrete controls should integrate with the form layer

It does **not** try to design a feature-complete form framework. In particular, we intentionally avoid over-expanding `ctrl.ts` beyond current project needs.

---

## Design principles

### 1. Use internal field semantics, not third-party behavior

The stable contract should be:

- form state
- field state
- validation state
- control integration API

It should **not** be:

- `naive-ui` injection keys
- `naive-ui` DOM structure
- `naive-ui` class names

### 2. Keep `ctrl.ts` small and practical

`ctrl.ts` should remain focused on:

- storing form values
- running validators
- storing latest validation results

UI interaction concerns such as IME composition, debounce timing, blur delay, and `aria-*` composition belong in the field/control layer instead of the form store.

### 3. Separate field logic from visual layout

`UIFormItem` should remain the public shell used by business code, but the internal architecture should distinguish between:

- form orchestration
- field semantics
- item/layout rendering
- concrete control behavior

### 4. Controls should work both inside and outside forms

A control such as `UITextInput` or `UISlider` must be able to:

- integrate automatically with form field context when present
- still behave normally when used standalone outside `UIForm`

### 5. Preserve current external usage where practical

Current usage such as this should remain valid:

```vue
<UIForm :form="form" @submit="handleSubmit">
  <UIFormItem path="name">
    <UITextInput v-model:value="form.value.name" />
  </UIFormItem>
</UIForm>
```

In other words, the current app can keep driving field values with `v-model:value="form.value.xxx"`. The new field layer mainly owns validation timing, IDs, and validation state propagation.

---

## High-level architecture

The architecture is split into four layers:

### A. Form core

Responsible for:

- form values
- validator registration
- field validation
- full-form validation
- latest validation results

Main file:

- `ctrl.ts`

### B. Field semantics

Responsible for:

- form-level injection
- field-level injection
- field validation state calculation
- field trigger handling (`input`, `change`, `blur`, IME composition)
- generated IDs for accessibility

Main files:

- `context.ts`
- `UIFormItem.vue`
- `useFormControl.ts`

### C. Public form shells

Responsible for:

- rendering the native `<form>` element
- rendering label / control / feedback / tip layout
- exposing the public API already used by business code

Main files:

- `UIForm.vue`
- `UIFormItem.vue`

### D. Concrete controls

Responsible for:

- specific input UI
- mapping control events into field event handlers
- applying control visuals based on field validation state

Files include:

- `UITextInput.vue`
- `UINumberInput.vue`
- `UISlider.vue`
- `UISwitch.vue`
- `checkbox/*`
- `radio/*`

---

## Target file structure

The `form/` directory should converge to:

```text
form/
  ARCHITECTURE.md
  README.md
  ctrl.ts
  context.ts
  useFormControl.ts
  UIForm.vue
  UIFormItem.vue
  index.ts
```

The following file should be removed after migration:

```text
form/UIFormItemInternal.vue
```

---

## Public API vs internal API

### Public API

These should continue to be exported from `@/components/ui`:

- `useForm` from `ctrl.ts`
- `UIForm`
- `UIFormItem`

### Internal API

These are internal building blocks and do not need to be re-exported from the top-level UI package at first:

- `useFormContext`
- `useMaybeFormFieldContext`
- `useFormControl`

This keeps the business-facing API stable while allowing internal iteration.

---

## `ctrl.ts` design

### Responsibility

`ctrl.ts` is the form store and validation executor.

It should do the minimum necessary work:

- create reactive form values
- register validators from the `useForm(...)` input
- validate a single field
- validate the entire form
- store the latest validation result per field

### Intended shape

```ts
export type FormValidationResult = string | null | undefined
export type FormValidatorReturned = FormValidationResult | Promise<FormValidationResult>
export type FormValidator<V> = (v: V) => FormValidatorReturned

export type FormValidated = { hasError: false } | { hasError: true; error: string }

export type FormPath<V> = Extract<keyof V, string>

export type FormCtrl<V = Record<string, unknown>> = {
  value: V
  validate: () => Promise<FormValidated>
  validateField: (path: FormPath<V>) => Promise<FormValidated>
  validateWithPath: (path: FormPath<V>) => Promise<FormValidated>
  validated: Partial<Record<FormPath<V>, FormValidated>>
}
```

### Notes

- `validateField` is the clearer long-term name
- `validateWithPath` is only a temporary legacy alias in `ctrl.ts`; new internal code should call `validateField`
- we intentionally do **not** add a large field meta system here yet
- future additions remain possible, but should be justified by concrete usage instead of speculative abstraction

### What stays out of `ctrl.ts`

The following concerns should not live in `ctrl.ts` for now:

- IME composition tracking
- debounce timing
- blur delay
- generated DOM IDs
- `aria-*` composition
- control-specific commit semantics

Those belong in `UIFormItem.vue` and `useFormControl.ts`.

---

## `context.ts` design

`context.ts` centralizes form-related injection keys and access helpers.

This avoids mixing Vue injection symbols directly into component files and prevents naming conflicts with `useForm` from `ctrl.ts`.

### Form context

```ts
export type FormContext<V = Record<string, unknown>> = {
  form: FormCtrl<V>
  hasSuccessFeedback: boolean
}
```

Suggested helpers:

```ts
export const formContextKey: InjectionKey<FormContext>
export function useFormContext(): FormContext
```

### Field validation state

```ts
export type FormFieldValidationState = 'default' | 'error' | 'success'
```

This is specifically a validation-state abstraction. It should not mix in disabled, readonly, or focus state.

### Field triggers

```ts
export type FormFieldValidateTrigger = 'input' | 'change' | 'blur'
```

`submit` remains a form-level behavior and does not need to be represented as a field trigger.

### Field config

```ts
export type FormFieldConfig = {
  validateOn: ReadonlyArray<FormFieldValidateTrigger>
  inputDebounce: number
  blurDelay: number
}
```

Recommended defaults:

```ts
{
  validateOn: ['input', 'change', 'blur'],
  inputDebounce: 300,
  blurDelay: 200
}
```

### Generated IDs

```ts
export type FormFieldIds = {
  labelId: string
  controlId: string
  tipId: string
  errorId: string
}
```

### Field context

```ts
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
```

Suggested helpers:

```ts
export const formFieldContextKey: InjectionKey<FormFieldContext>
export function useMaybeFormFieldContext(): FormFieldContext | null
```

### Why the field context does not own the field value

Current application code already binds values directly through `v-model:value="form.value.xxx"`.

To minimize churn, field context should initially focus on:

- validation state
- trigger callbacks
- accessibility IDs

rather than taking over value ownership.

This keeps migration practical while leaving space for deeper form abstractions later if the project actually needs them.

---

## `UIForm.vue` design

### Responsibility

- render a native `<form>`
- prevent native browser validation UI via `novalidate`
- provide form context
- run full validation on submit
- emit `submit` only when the form passes validation

### Public API

Keep the existing public shape:

- `form: FormCtrl`
- `hasSuccessFeedback?: boolean`
- `@submit`

### Notes

- root attrs/class/style should continue to land on the native form element
- form submission remains the place where full validation is guaranteed

---

## `UIFormItem.vue` design

### Responsibility

`UIFormItem` remains the public wrapper used by business code.

Internally it should:

- own field context + timing semantics directly
- receive `path`
- read the current validation result from form context
- derive field validation state (`default` / `error` / `success`)
- generate stable field IDs
- manage field-level interaction timing
- provide field context to descendant controls
- render label / control / feedback / tip layout
- expose field validation state through DOM hooks owned by our UI library

It should **not** depend on `naive-ui` form-item behavior.

### Public API

Keep the current API:

- `label?: string`
- `path?: string`
- `class?: ClassValue`
- default slot
- `tip` slot

`config?: Partial<FormFieldConfig>` stays internal for now. If real product needs emerge later,
selected pieces can be exposed through the public API deliberately instead of leaking the whole config.

### Internal behavior

`UIFormItem.vue` should:

1. read `form` and `hasSuccessFeedback` from `useFormContext()`
2. read `validated[path]`
3. compute `feedback`
4. compute `invalid`
5. compute `validationState`
6. generate `labelId`, `controlId`, `tipId`, `errorId`
7. manage IME composition state
8. debounce `onInput`
9. delay `onBlur`
10. call `form.validateField(path)` when triggers apply
11. provide `FormFieldContext`

### Validation-state rules

The derived state should match current behavior:

1. no validation result for the path -> `default`
2. latest validation result has error -> `error`
3. latest validation result is success and `hasSuccessFeedback === true` -> `success`
4. otherwise -> `default`

### `describedBy` rules

Recommended composition:

- tip only -> `tipId`
- error only -> `errorId`
- both -> `${tipId} ${errorId}`
- neither -> `undefined`

### ID generation

Use Vue's stable ID utility where available (`useId()` in Vue 3.5+) so controls and labels remain consistently linked.

### Internal structure

Recommended structure:

```vue
<div :data-ui-state="validationState">
  <div v-if="label" :id="ids.labelId">
    {{ label }}
  </div>

  <div>
    <slot />
  </div>

  <p v-if="feedback != null" :id="ids.errorId">
    {{ feedback }}
  </p>

  <p v-if="$slots.tip" :id="ids.tipId">
    <slot name="tip" />
  </p>
</div>
```

### Why not rely on `<label for="...">` yet

`UIFormItem` can contain:

- a single text input
- a radio group
- a checkbox group
- a composite custom control

Because not every control is a single labelable DOM element, the first-step contract should prefer:

- generated `labelId`
- generated `aria-labelledby`

This is more general than coupling item layout to a specific `for` target.

---

## `useFormControl.ts` design

`useFormControl()` is the control-side adapter for form field integration.

### Responsibility

It converts `FormFieldContext` into control-friendly values and handlers.

### Suggested control binding shape

```ts
export type FormControlBindings = {
  id?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-invalid'?: 'true'
  'data-ui-state'?: FormFieldValidationState
}
```

### Suggested return shape

```ts
export function useFormControl() {
  return {
    validationState: ComputedRef<FormFieldValidationState>
    invalid: ComputedRef<boolean>
    feedback: ComputedRef<string | null>

    controlBindings: ComputedRef<FormControlBindings>

    onInput: () => void
    onChange: () => void
    onBlur: () => void
    onCompositionStart: () => void
    onCompositionEnd: () => void
  }
}
```

### Behavior in and out of forms

When field context exists:

- return field-derived validation state
- return generated `aria-*` bindings
- delegate event handlers to the field context

When field context does not exist:

- `validationState = 'default'`
- `invalid = false`
- `feedback = null`
- `controlBindings = {}`
- all event handlers are no-ops

This makes controls reusable inside and outside form items.

---

## Control integration guidelines

Concrete controls should integrate through `useFormControl()` instead of touching field context directly.

### `UITextInput.vue`

Should:

- use `useFormControl()`
- bind `controlBindings` to the actual input/textarea element
- call `onInput()` on value input
- call `onBlur()` on blur
- call `onCompositionStart()` / `onCompositionEnd()` during IME composition
- derive validation visuals from `validationState` / `data-ui-state`

### `UINumberInput.vue`

Should:

- use `useFormControl()`
- own number-specific display/commit behavior itself
- call `onInput()` during typing when appropriate
- call `onBlur()` when blur commits/normalizes state
- call `onChange()` when there is a more discrete value-confirmation moment

### `UISlider.vue`

Should:

- use `useFormControl()`
- own slider-specific drag/commit behavior itself
- call `onInput()` for real-time update mode
- call `onChange()` when value is committed on drag end

### `UICheckbox.vue`, `UIRadio.vue`, `UISwitch.vue`

Should:

- use `useFormControl()`
- call `onChange()` when checked/value changes

### Group controls

`UICheckboxGroup.vue` and `UIRadioGroup.vue` should usually be the integration point for form control bindings:

- the group root uses `useFormControl()`
- the group root applies `controlBindings`
- the group root calls `onChange()` when group value changes
- individual options should integrate with group context rather than directly with form field context

---

## Visual contract

The new system should rely on our own DOM/state hooks instead of `.n-*` selectors.

### Recommended field/control hook

Use a stable attribute such as:

```html
data-ui-state="default|error|success"
```

This should be applied consistently where validation-state-based styling is needed.

### Why use our own hook

This lets us remove styling dependencies on:

- `.n-input--error-status`
- `.n-input--success-status`
- `.n-form-item-*`
- older slider hook classes

and replace them with internal, stable styling contracts.

---

## Migration expectations

The implementation should proceed with the following structural changes:

### Add

- `form/context.ts`
- `form/useFormControl.ts`
- this document

### Update

- `form/ctrl.ts`
- `form/UIForm.vue`
- `form/UIFormItem.vue`
- `form/index.ts`
- concrete control components that need field integration

### Remove

- `form/UIFormItemInternal.vue`

---

## Out-of-scope for the first implementation

The following are intentionally not required for the first pass:

- a full touched/dirty/meta state model in `ctrl.ts`
- nested/object-path field resolution beyond current project needs
- converting controls to be fully path-driven by the form layer
- a full generic schema/form framework
- solving every future form use case preemptively

Those can be added later if concrete product needs justify them.

---

## Follow-up checklist

Use this as the implementation checklist for the next phase.

### Form core

- [x] add `FormPath<V>`
- [x] add `validateField()` to `FormCtrl`
- [x] keep `useForm(...)` external usage stable

### Field semantics

- [x] add `context.ts`
- [x] add `useFormControl.ts`
- [x] migrate `UIForm.vue` to native `<form>`
- [x] migrate `UIFormItem.vue` to internal label/control/feedback/tip layout

### Control contract integration

- [x] migrate `UITextInput.vue` to the internal form-control contract
- [x] migrate `UINumberInput.vue` to the internal form-control contract
- [x] migrate `UISlider.vue` to the internal form-control contract
- [x] migrate `UISwitch.vue` to the internal form-control contract
- [ ] migrate `UICheckbox.vue` to the internal form-control contract
- [x] migrate `UICheckboxGroup.vue` to the internal form-control contract
- [ ] migrate `UIRadio.vue` to the internal form-control contract
- [x] migrate `UIRadioGroup.vue` to the internal form-control contract

The unchecked items above are not all blocked for the same reason:

- `UICheckbox.vue` and `UIRadio.vue` are often used as individual options inside
  `UICheckboxGroup.vue` / `UIRadioGroup.vue`, so form-field integration usually belongs on the group root
  rather than on each option component.
- As a result, the current priority is to integrate components that act as the actual form-field boundary,
  then revisit standalone option controls only if concrete product usage requires them.

In the current codebase specifically:

- `UICheckbox.vue` does not currently appear as a direct child of `UIFormItem`.
- `UIRadio.vue` does appear in form flows, but only as an option rendered inside `UIRadioGroup.vue`,
  not as a standalone field root.

### Control `naive-ui` removal

- [x] remove `naive-ui` from `UITextInput.vue`
- [x] remove `naive-ui` from `UINumberInput.vue`
- [x] remove `naive-ui` from `UISlider.vue`
- [ ] remove `naive-ui` from `UISwitch.vue`
- [ ] remove `naive-ui` from `UICheckbox.vue`
- [ ] remove `naive-ui` from `UICheckboxGroup.vue`
- [ ] remove `naive-ui` from `UIRadio.vue`
- [ ] remove `naive-ui` from `UIRadioGroup.vue`

### Cleanup

- [x] remove `UIFormItemInternal.vue`
- [ ] remove remaining `naive-ui` choice-control wrappers from `UISwitch.vue`, `UICheckbox.vue`, `UICheckboxGroup.vue`, `UIRadio.vue`, and `UIRadioGroup.vue`
- [ ] remove remaining business-side state-class assumptions such as `.n-radio--checked` in `xgo-code-editor/ui/input-helper/BooleanInput.vue`
- [ ] update `README.md` after implementation lands

---

## Summary

The key architectural decision is:

- keep `ctrl.ts` small and practical
- introduce a dedicated field semantics layer
- expose a control adapter (`useFormControl()`) for all concrete controls
- preserve current business-level value binding patterns
- own our validation state, DOM hooks, and accessibility contract

This gives the project a maintainable internal foundation for replacing the remaining `naive-ui` form/input primitives without over-designing the form store.
