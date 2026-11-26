export function getDefaultLang(value: string | undefined): 'en' | 'zh' {
  if (!value) return 'en'
  if (value === 'en' || value === 'zh') return value
  throw new Error(`Default language must be "en" or "zh", got ${JSON.stringify(value)}`)
}
