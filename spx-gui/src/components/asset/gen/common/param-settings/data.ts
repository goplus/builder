import { Facing } from '@/apis/aigc'
import { AnimationLoopMode, ArtStyle, BackdropCategory, Perspective, SpriteCategory } from '@/apis/common'

import imgPixel from './assets/pixel.png'
import imgFlat from './assets/flat.png'
import imgHandDrawn from './assets/hand-drawn.png'
import imgLowPoly from './assets/low-poly.png'
import imgGhibli from './assets/ghibli.png'
import imgAngledTopDown from './assets/angled-top-down.png'
import imgSideScrolling from './assets/side-scrolling.png'
import imgCharacter from './assets/character.png'
import imgItem from './assets/item.png'
import imgEffect from './assets/effect.png'
import imgUI from './assets/ui.png'
import imgFront from './assets/front.png'
import imgBack from './assets/back.png'
import imgLeft from './assets/left.png'
import imgRight from './assets/right.png'
import imgLoopable from './assets/loopable.png'
import imgNonLoopable from './assets/non-loopable.png'

export const artStyleOptions = [
  {
    value: ArtStyle.PixelArt,
    image: imgPixel,
    label: { en: 'Pixel art', zh: '像素艺术' }
  },
  {
    value: ArtStyle.FlatDesign,
    image: imgFlat,
    label: { en: 'Flat design', zh: '扁平设计' }
  },
  {
    value: ArtStyle.HandDrawn,
    image: imgHandDrawn,
    label: { en: 'Hand drawn', zh: '手绘' }
  },
  {
    value: ArtStyle.LowPoly,
    image: imgLowPoly,
    label: { en: 'Low poly', zh: '低多边形' }
  },
  {
    value: ArtStyle.Ghibli,
    image: imgGhibli,
    label: { en: 'Ghibli', zh: '吉卜力' }
  }
]

export const perspectiveOptions = [
  {
    value: Perspective.AngledTopDown,
    image: imgAngledTopDown,
    label: { en: 'Angled top down', zh: '倾斜俯视' }
  },
  {
    value: Perspective.SideScrolling,
    image: imgSideScrolling,
    label: { en: 'Side scrolling', zh: '侧滚动' }
  }
]

export const facingOptions = [
  { value: Facing.Front, image: imgFront, label: { en: 'Front', zh: '正面' } },
  { value: Facing.Back, image: imgBack, label: { en: 'Back', zh: '背面' } },
  { value: Facing.Left, image: imgLeft, label: { en: 'Left', zh: '左边' } },
  { value: Facing.Right, image: imgRight, label: { en: 'Right', zh: '右边' } }
]

export const spriteCategoryOptions = [
  {
    value: SpriteCategory.Character,
    image: imgCharacter,
    label: { en: 'Character', zh: '角色' }
  },
  {
    value: SpriteCategory.Item,
    image: imgItem,
    label: { en: 'Item', zh: '物品' }
  },
  {
    value: SpriteCategory.Effect,
    image: imgEffect,
    label: { en: 'Effect', zh: '效果' }
  },
  {
    value: SpriteCategory.UI,
    image: imgUI,
    label: { en: 'UI', zh: 'UI' }
  }
]

export const backdropCategoryOptions = [
  {
    value: BackdropCategory.UI,
    image: imgUI,
    label: { en: 'UI', zh: 'UI' }
  }
]

export const loopModeOptions = [
  {
    value: AnimationLoopMode.Loopable,
    image: imgLoopable,
    label: { en: 'Loopable', zh: '可循环' }
  },
  {
    value: AnimationLoopMode.NonLoopable,
    image: imgNonLoopable,
    label: { en: 'Non loopable', zh: '不可循环' }
  }
]
