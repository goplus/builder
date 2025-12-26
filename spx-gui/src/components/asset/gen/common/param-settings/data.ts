import { Facing } from '@/apis/aigc'
import { AnimationLoopMode, ArtStyle, BackdropCategory, Perspective, SpriteCategory } from '@/apis/common'

export function getOptionImage(name: string) {
  return new URL(`./assets/${name}.png`, import.meta.url).href
}

export const artStyleOptions = [
  {
    value: ArtStyle.PixelArt,
    image: getOptionImage('pixel'),
    label: { en: 'Pixel Art', zh: '像素艺术' },
    tips: { en: 'Art Style: Pixel Art', zh: '艺术风格：像素艺术' }
  },
  {
    value: ArtStyle.FlatDesign,
    image: getOptionImage('flat'),
    label: { en: 'Flat Design', zh: '扁平设计' },
    tips: { en: 'Art Style: Flat Design', zh: '艺术风格：扁平设计' }
  },
  {
    value: ArtStyle.HandDrawn,
    image: getOptionImage('hand-drawn'),
    label: { en: 'Hand Drawn', zh: '手绘' },
    tips: { en: 'Art Style: Hand Drawn', zh: '艺术风格：手绘' }
  },
  {
    value: ArtStyle.LowPoly,
    image: getOptionImage('low-poly'),
    label: { en: 'Low Poly', zh: '低多边形' },
    tips: { en: 'Art Style: Low Poly', zh: '艺术风格：低多边形' }
  },
  {
    value: ArtStyle.Ghibli,
    image: getOptionImage('ghibli'),
    label: { en: 'Ghibli', zh: '吉卜力' },
    tips: { en: 'Art Style: Ghibli', zh: '艺术风格：吉卜力' }
  },
  {
    value: ArtStyle.Unspecified,
    image: getOptionImage('unspecified'),
    label: { en: 'Unspecified', zh: '未指定' },
    tips: { en: 'Art Style: Unspecified', zh: '艺术风格：未指定' }
  }
]

export const perspectiveOptions = [
  {
    value: Perspective.AngledTopDown,
    image: getOptionImage('angled-top-down'),
    label: { en: 'Angled Top Down', zh: '倾斜俯视' },
    tips: { en: 'Perspective: Angled Top Down', zh: '视角：倾斜俯视' }
  },
  {
    value: Perspective.SideScrolling,
    image: getOptionImage('side-scrolling'),
    label: { en: 'Side Scrolling', zh: '侧滚动' },
    tips: { en: 'Perspective: Side Scrolling', zh: '视角：侧滚动' }
  },
  {
    value: Perspective.Unspecified,
    image: getOptionImage('unspecified'),
    label: { en: 'Unspecified', zh: '未指定' },
    tips: { en: 'Perspective: Unspecified', zh: '视角：未指定' }
  }
]

export const facingOptions = [
  { value: Facing.Front, label: { en: 'Front', zh: '正面' }, tips: { en: 'Facing: Front', zh: '朝向：正面' } },
  { value: Facing.Back, label: { en: 'Back', zh: '背面' }, tips: { en: 'Facing: Back', zh: '朝向：背面' } },
  { value: Facing.Left, label: { en: 'Left', zh: '左边' }, tips: { en: 'Facing: Left', zh: '朝向：左边' } },
  { value: Facing.Right, label: { en: 'Right', zh: '右边' }, tips: { en: 'Facing: Right', zh: '朝向：右边' } },
  {
    value: Facing.Unspecified,
    label: { en: 'Unspecified', zh: '未指定' },
    tips: { en: 'Facing: Unspecified', zh: '朝向：未指定' }
  }
]

export const spriteCategoryOptions = [
  {
    value: SpriteCategory.Character,
    image: getOptionImage('character'),
    label: { en: 'Character', zh: '角色' },
    tips: { en: 'Sprite Category: Character', zh: '精灵类型：角色' }
  },
  {
    value: SpriteCategory.Item,
    image: getOptionImage('item'),
    label: { en: 'Item', zh: '物品' },
    tips: { en: 'Sprite Category: Item', zh: '精灵类型：物品' }
  },
  {
    value: SpriteCategory.Effect,
    image: getOptionImage('effect'),
    label: { en: 'Effect', zh: '效果' },
    tips: { en: 'Sprite Category: Effect', zh: '精灵类型：效果' }
  },
  {
    value: SpriteCategory.UI,
    image: getOptionImage('ui'),
    label: { en: 'UI', zh: 'UI' },
    tips: { en: 'Sprite Category: UI', zh: '精灵类型：UI' }
  },
  {
    value: SpriteCategory.Unspecified,
    image: getOptionImage('unspecified'),
    label: { en: 'Unspecified', zh: '未指定' },
    tips: { en: 'Sprite Category: Unspecified', zh: '精灵类型：未指定' }
  }
]

export const backdropCategoryOptions = [
  {
    value: BackdropCategory.UI,
    label: { en: 'UI', zh: 'UI' },
    tips: { en: 'Backdrop Category: UI', zh: '背景类型：UI' }
  },
  {
    value: BackdropCategory.Unspecified,
    label: { en: 'Unspecified', zh: '未指定' },
    tips: { en: 'Backdrop Category: Unspecified', zh: '背景类型：未指定' }
  }
]

export const loopModeOptions = [
  {
    value: AnimationLoopMode.Loopable,
    label: { en: 'Loopable', zh: '可循环' },
    tips: { en: 'Animation Loop Mode: Loopable', zh: '动画循环模式：可循环' }
  },
  {
    value: AnimationLoopMode.NonLoopable,
    label: { en: 'Non Loopable', zh: '不可循环' },
    tips: { en: 'Animation Loop Mode: Non Loopable', zh: '动画循环模式：不可循环' }
  }
]
