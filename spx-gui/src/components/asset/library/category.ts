import type { LocaleMessage } from '@/utils/i18n'

export type Category = {
  value: string
  message: LocaleMessage
}

export const categories: Category[] = [
  { value: 'People', message: { en: 'People', zh: '人物' } },
  { value: 'Animals', message: { en: 'Animals', zh: '动物' } },
  { value: 'Nature', message: { en: 'Nature', zh: '自然' } },
  { value: 'UI', message: { en: 'UI', zh: '界面' } }
]

export const categoryAll: Category = { value: '*', message: { en: 'All', zh: '所有' } }
