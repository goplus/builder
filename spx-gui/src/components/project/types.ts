import type { LocaleMessage } from '@/utils/i18n'

export type SettingOption = {
  value: string
  label: LocaleMessage
}

export const artStyleOptions: SettingOption[] = [
  { value: 'realistic', label: { en: 'Realistic', zh: '写实' } },
  { value: 'cartoon', label: { en: 'Cartoon', zh: '卡通' } },
  { value: 'pixel', label: { en: 'Pixel Art', zh: '像素风' } },
  { value: 'watercolor', label: { en: 'Watercolor', zh: '水彩' } },
  { value: 'anime', label: { en: 'Anime', zh: '动漫' } },
  { value: 'sketch', label: { en: 'Sketch', zh: '素描' } }
]

export const perspectiveOptions: SettingOption[] = [
  { value: 'front', label: { en: 'Front View', zh: '正面' } },
  { value: 'side', label: { en: 'Side View', zh: '侧面' } },
  { value: 'top-down', label: { en: 'Top-Down', zh: '俯视' } },
  { value: 'isometric', label: { en: 'Isometric', zh: '等距' } },
  { value: '3d', label: { en: '3D View', zh: '3D视角' } }
]
