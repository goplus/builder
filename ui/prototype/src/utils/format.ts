export function humanizeCount(value: number): string {
  if (value >= 10000) return `${Math.round(value / 1000)}k`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

export function pluralize(value: number, word: string): string {
  return `${value} ${word}${value === 1 ? '' : 's'}`
}
