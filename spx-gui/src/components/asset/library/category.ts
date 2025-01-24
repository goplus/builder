import type { LocaleMessage } from '@/utils/i18n'
import { AssetType } from '@/apis/asset'

export type Category = {
  value: string
  message: LocaleMessage
}

export const spriteCategories: Category[] = [
  { value: 'People', message: { en: 'People', zh: '人物' } },
  { value: 'Animals', message: { en: 'Animals', zh: '动物' } },
  { value: 'Daily', message: { en: 'Daily', zh: '日常' } },
  { value: 'Fantasy', message: { en: 'Fantasy', zh: '幻想' } },
  { value: 'Nature', message: { en: 'Nature', zh: '自然' } },
  { value: 'UI', message: { en: 'UI', zh: '界面' } }
]

export const backdropCategories: Category[] = [
  { value: 'Daily', message: { en: 'Daily', zh: '日常' } },
  { value: 'Fantasy', message: { en: 'Fantasy', zh: '幻想' } },
  { value: 'Nature', message: { en: 'Nature', zh: '自然' } },
  { value: 'UI', message: { en: 'UI', zh: '界面' } }
]

export const soundCategories: Category[] = [
  // TODO: discussion needed
  { value: 'Daily', message: { en: 'Daily', zh: '日常' } },
  { value: 'Nature', message: { en: 'Nature', zh: '自然' } }
]

export function getAssetCategories(type: AssetType): Category[] {
  switch (type) {
    case AssetType.Sprite:
      return spriteCategories
    case AssetType.Backdrop:
      return backdropCategories
    case AssetType.Sound:
      return soundCategories
    default:
      return []
  }
}

export const categoryAll: Category = { value: '*', message: { en: 'All', zh: '所有' } }
