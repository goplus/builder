// Keep language matching in sync with src/utils/i18n/index.ts.
export function normalizeLang(lang: string): 'en' | 'zh' {
  if (lang.toLowerCase().split('-')[0] === 'zh') return 'zh'
  return 'en'
}
