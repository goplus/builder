/**
 * A minimal slot-based recipe helper for the project's UI library.
 *
 * Purpose:
 * - provide a lightweight, project-local alternative to `tailwind-variants`
 * - keep slot/variant/compound-variant logic out of large Vue templates
 * - centralize class generation while still letting the caller merge root classes with `twMerge`
 *
 * Typical usage:
 * ```ts
 * const buttonRecipe = createRecipe({
 *   slots: {
 *     root: 'inline-flex',
 *     content: 'items-center justify-center',
 *     icon: 'shrink-0'
 *   },
 *   variants: {
 *     size: {
 *       small: { content: 'px-2', icon: 'size-3' },
 *       large: { content: 'px-4', icon: 'size-5' }
 *     },
 *     loading: {
 *       true: { root: 'cursor-not-allowed' },
 *       false: null
 *     }
 *   },
 *   defaultVariants: {
 *     size: 'small',
 *     loading: false
 *   },
 *   compoundVariants: [{
 *     when: { size: 'large', loading: true },
 *     class: { content: 'opacity-80' }
 *   }]
 * })
 *
 * const classes = buttonRecipe({ size: 'large', loading: true })
 * classes.root('w-full')
 * classes.content()
 * ```
 */
import { cn, type ClassValue } from './cn'

export type SlotClasses<SlotName extends string> = Partial<Record<SlotName, ClassValue>>
export type VariantDefinitions<SlotName extends string> = Record<string, Record<string, SlotClasses<SlotName> | null>>
type VariantSelectionDefinitions = Record<string, Record<string, unknown>>

type BooleanVariantKeys = 'true' | 'false'

type BooleanVariantValue<TVariant extends Record<string, unknown>> =
  TVariant extends Record<BooleanVariantKeys, unknown> ? boolean : never

type VariantInputValue<TVariant extends Record<string, unknown>> = keyof TVariant | BooleanVariantValue<TVariant>

type NormalizedRecipeSelection<TVariants extends VariantSelectionDefinitions> = Partial<{
  [K in keyof TVariants]: keyof TVariants[K] | null
}>

export type RecipeSelection<TVariants extends VariantSelectionDefinitions> = Partial<{
  [K in keyof TVariants]: VariantInputValue<TVariants[K]> | null
}>

export type RecipeCondition<TVariants extends VariantSelectionDefinitions> = Partial<{
  [K in keyof TVariants]: VariantInputValue<TVariants[K]> | ReadonlyArray<VariantInputValue<TVariants[K]>> | null
}>

export type RecipeConfig<SlotName extends string, TVariants extends VariantDefinitions<SlotName>> = {
  slots: Record<SlotName, ClassValue>
  variants?: TVariants
  defaultVariants?: RecipeSelection<TVariants>
  /**
   * Extra classes applied only when all `when` conditions match.
   * This is the main escape hatch for cross-variant combinations such as
   * `variant=shadow + loading=true`.
   */
  compoundVariants?: Array<{
    when: RecipeCondition<TVariants>
    class: SlotClasses<SlotName>
  }>
}

export type RecipeResult<SlotName extends string> = Record<SlotName, (extra?: ClassValue) => string>

function normalizeVariantValue(value: string | boolean | null) {
  if (typeof value === 'boolean') return String(value) as BooleanVariantKeys
  return value
}

/**
 * Internally normalize boolean-like variant inputs to `'true' | 'false'`.
 * The public API accepts booleans, but the variant lookup table still uses
 * object keys, so normalization keeps the caller API ergonomic.
 */
function normalizeSelection<TVariants extends VariantSelectionDefinitions>(selection: RecipeSelection<TVariants>) {
  return Object.fromEntries(
    Object.entries(selection).map(([variantName, value]) => [variantName, normalizeVariantValue(value ?? null)])
  ) as NormalizedRecipeSelection<TVariants>
}

/**
 * Match a single compound variant against the normalized selection.
 * Array values in `when` behave like “one of these values”.
 */
function matchesCondition<TVariants extends VariantSelectionDefinitions>(
  selection: NormalizedRecipeSelection<TVariants>,
  condition: RecipeCondition<TVariants>
) {
  for (const [variantName, expectedValue] of Object.entries(condition)) {
    const currentValue = selection[variantName as keyof TVariants]
    if (Array.isArray(expectedValue)) {
      if (currentValue == null) return false
      const normalizedExpectedValues = expectedValue.map((value) => normalizeVariantValue(value ?? null))
      if (!normalizedExpectedValues.includes(currentValue as string | null)) return false
      continue
    }
    if (currentValue !== normalizeVariantValue(expectedValue ?? null)) return false
  }
  return true
}

export function createRecipe<const SlotName extends string, const TVariants extends VariantDefinitions<SlotName>>(
  config: RecipeConfig<SlotName, TVariants>
) {
  const variants = config.variants ?? ({} as TVariants)
  const defaultVariants = normalizeSelection(config.defaultVariants ?? ({} as RecipeSelection<TVariants>))
  const compoundVariants = config.compoundVariants ?? []
  const slotNames = Object.keys(config.slots) as SlotName[]

  return (selectionInput: RecipeSelection<TVariants> = {}) => {
    // Start from defaults, then override with the caller selection.
    const selection = {
      ...defaultVariants,
      ...normalizeSelection(selectionInput)
    } as NormalizedRecipeSelection<TVariants>

    // Each slot accumulates base classes first, then variant classes,
    // then compound-variant classes, and finally caller-provided extras.
    const resolvedClasses = Object.fromEntries(
      slotNames.map((slotName) => [slotName, [config.slots[slotName]]])
    ) as Record<SlotName, ClassValue[]>

    for (const [variantName, variantOptions] of Object.entries(variants)) {
      const variantValue = selection[variantName as keyof TVariants]
      if (variantValue == null) continue

      const variantClasses = variantOptions[variantValue as string]
      if (variantClasses == null) continue

      for (const slotName of slotNames) {
        const slotClass = variantClasses[slotName]
        if (slotClass == null) continue
        resolvedClasses[slotName].push(slotClass)
      }
    }

    for (const compoundVariant of compoundVariants) {
      if (!matchesCondition(selection, compoundVariant.when)) continue

      for (const slotName of slotNames) {
        const slotClass = compoundVariant.class[slotName]
        if (slotClass == null) continue
        resolvedClasses[slotName].push(slotClass)
      }
    }

    return Object.fromEntries(
      slotNames.map((slotName) => [
        slotName,
        // The caller can pass extra classes here (commonly attrs.class for root).
        // `cn()` applies `twMerge`, so conflicting Tailwind utilities collapse in
        // a predictable way.
        (extra: ClassValue = null) => cn(resolvedClasses[slotName], extra)
      ])
    ) as RecipeResult<SlotName>
  }
}
