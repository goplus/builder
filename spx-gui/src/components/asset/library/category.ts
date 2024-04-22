import type { LocaleMessage } from '@/utils/i18n'

export type Category = {
  value: string
  message: LocaleMessage
}

export const categories: Category[] = [
  { value: 'Animals', message: { en: 'Animals', zh: '动物' } },
  { value: 'People', message: { en: 'People', zh: '人类' } },
  { value: 'Sports', message: { en: 'Sports', zh: '运动' } },
  { value: 'Food', message: { en: 'Food', zh: '食物' } },
  { value: 'Fantasy', message: { en: 'Fantasy', zh: '幻想' } }
]

export const categoryAll: Category = { value: '*', message: { en: 'All', zh: '所有' } }
