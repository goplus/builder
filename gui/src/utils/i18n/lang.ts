export type Lang = 'en' | 'zh'

export function normalizeLang(lang: string): Lang {
  if (lang.toLowerCase().split('-')[0] === 'zh') return 'zh'
  return 'en'
}
