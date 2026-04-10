import { extendTailwindMerge, validators } from 'tailwind-merge'

export type ClassDictionary = Record<string, boolean | null>
export type ClassValue = string | ClassDictionary | null | false | ClassValue[]

function flattenClassValue(value: ClassValue, tokens: string[]) {
  if (value == null || value === false) return

  if (typeof value === 'string') {
    tokens.push(value)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) flattenClassValue(item, tokens)
    return
  }

  for (const [className, enabled] of Object.entries(value)) {
    if (enabled === true) tokens.push(className)
  }
}

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      // `text` is the key of the namespace `--text-*`
      text: [validators.isNumber]
    }
  }
})

/**
 * Small class-name helper used by UI components.
 *
 * Responsibilities:
 * - flatten nested arrays / dictionaries / falsey values into a plain class list
 * - pass the final class string through `tailwind-merge` so later utilities can override earlier ones
 *
 * Important boundary:
 * - merge quality depends on class naming. Standard Tailwind utility names (for example `rounded-md`, `px-2`, `text-15`)
 *   are much more likely to merge predictably than project-private aliases such as old `rounded-2` style names.
 * - this project extends `tailwind-merge` so numeric `text-<number>` utilities such as `text-15` are treated as font-size classes
 *   instead of text colors. `text-base` is standard Tailwind utility that work out of the box and do not need extra merge config.
 * - additional semantic `text-*` size aliases would still share the namespace with text colors. If those are
 *   introduced later, extend this merge config first so names like `text-heading` do not collide with `text-title`.
 */
export function cn(...values: ClassValue[]) {
  const tokens: string[] = []
  for (const value of values) flattenClassValue(value, tokens)
  return twMerge(tokens.join(' '))
}
