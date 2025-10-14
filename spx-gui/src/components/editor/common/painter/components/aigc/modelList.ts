import type { LocaleMessage } from '@/utils/i18n'

export interface ModelInfo {
  id: string
  name: LocaleMessage
  description: LocaleMessage
  preview_url: string
}

import previewImage from './images/preview.jpg'
import businessImage from './images/business.jpg'
import cartoonImage from './images/cartoon.jpg'
import cyberImage from './images/cyber.jpg'
import magicImage from './images/magic.jpg'
import minimalImage from './images/minimal.jpg'
import natrueImage from './images/natrue.jpg'
import realisticImage from './images/realistic.jpg'
import retroImage from './images/retro.jpg'

export const ModelList: ModelInfo[] = [
  {
    id: '',
    name: { en: 'No Theme', zh: '无主题' },
    description: { en: 'No specific theme style applied', zh: '不应用任何特定主题风格' },
    preview_url: previewImage
  },
  {
    id: 'business',
    name: { en: 'Business Style', zh: '商务风格' },
    description: { en: 'Professional business style with modern corporate image', zh: '专业商务风格，现代企业形象' },
    preview_url: businessImage
  },
  {
    id: 'cartoon',
    name: { en: 'Cartoon Style', zh: '卡通风格' },
    description: {
      en: 'Vibrant cartoon style, perfect for cute and fun content',
      zh: '色彩鲜艳的卡通风格，适合可爱有趣的内容'
    },
    preview_url: cartoonImage
  },
  {
    id: 'scifi',
    name: { en: 'Sci-Fi Style', zh: '科技风格' },
    description: { en: 'Futuristic sci-fi style with technological elements', zh: '未来科技风格，充满科幻元素' },
    preview_url: cyberImage
  },
  {
    id: 'fantasy',
    name: { en: 'Fantasy Style', zh: '魔法风格' },
    description: {
      en: 'Fantasy style filled with magical and supernatural elements',
      zh: '充满魔法和超自然元素的奇幻风格'
    },
    preview_url: magicImage
  },
  {
    id: 'minimal',
    name: { en: 'Minimal Style', zh: '极简风格' },
    description: { en: 'Minimalist style with clean and simple design', zh: '极简主义风格，简洁干净的设计' },
    preview_url: minimalImage
  },
  {
    id: 'nature',
    name: { en: 'Nature Style', zh: '自然风格' },
    description: {
      en: 'Natural organic style using natural elements and earth tones',
      zh: '自然有机风格，使用自然元素和大地色调'
    },
    preview_url: natrueImage
  },
  {
    id: 'realistic',
    name: { en: 'Realistic Style', zh: '写实风格' },
    description: { en: 'Highly realistic style with rich and lifelike details', zh: '高度写实的风格，细节丰富逼真' },
    preview_url: realisticImage
  },
  {
    id: 'retro',
    name: { en: 'Retro Style', zh: '复古风格' },
    description: { en: 'Nostalgic retro style with classic vintage aesthetics', zh: '怀旧复古风格，经典老式美学' },
    preview_url: retroImage
  }
]
