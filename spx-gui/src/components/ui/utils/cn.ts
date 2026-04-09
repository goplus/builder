import { twMerge } from 'tailwind-merge'

export type ClassDictionary = Record<string, boolean | null>
export type ClassValue = string | ClassDictionary | null | false | ClassValue[]

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
 * - when two concerns share the same utility namespace, `tailwind-merge` may collapse them together. For example,
 *   font-size utilities like `text-15` and color shorthands like `text-(color:...)` can conflict. In those cases,
 *   prefer raw CSS property utilities such as `[color:var(--...)]`.
 */
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

export function cn(...values: ClassValue[]) {
  const tokens: string[] = []
  for (const value of values) flattenClassValue(value, tokens)
  return twMerge(tokens.join(' '))
}
