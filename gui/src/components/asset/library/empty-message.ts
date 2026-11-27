import type { LocaleMessage } from '@/utils/i18n'

export function getAssetListEmptyMessage(keyword: string): LocaleMessage {
  if (keyword === '') return { en: 'No assets yet', zh: '还没有素材' }
  return { en: 'No matching assets', zh: '没有匹配的素材' }
}
