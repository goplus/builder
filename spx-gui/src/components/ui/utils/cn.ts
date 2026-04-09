import { twMerge } from 'tailwind-merge'

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

export function cn(...values: ClassValue[]) {
  const tokens: string[] = []
  for (const value of values) flattenClassValue(value, tokens)
  return twMerge(tokens.join(' '))
}
