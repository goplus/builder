import { Facing } from '@/apis/aigc'
import { AnimationLoopMode, ArtStyle, BackdropCategory, Perspective, SpriteCategory } from '@/apis/common'

export const artStyleOptions = [
  { value: ArtStyle.PixelArt, label: { en: 'Pixel Art', zh: '像素艺术' } },
  { value: ArtStyle.FlatDesign, label: { en: 'Flat Design', zh: '扁平设计' } },
  { value: ArtStyle.HandDrawn, label: { en: 'Hand Drawn', zh: '手绘' } },
  { value: ArtStyle.LowPoly, label: { en: 'Low Poly', zh: '低多边形' } },
  { value: ArtStyle.Unspecified, label: { en: 'Unspecified', zh: '未指定' } }
]

export const perspectiveOptions = [
  { value: Perspective.TrueTopDown, label: { en: 'True Top Down', zh: '真俯视' } },
  { value: Perspective.AngledTopDown, label: { en: 'Angled Top Down', zh: '倾斜俯视' } },
  { value: Perspective.SideScrolling, label: { en: 'Side Scrolling', zh: '侧滚动' } },
  { value: Perspective.Unspecified, label: { en: 'Unspecified', zh: '未指定' } }
]

export const facingOptions = [
  { value: Facing.Front, label: { en: 'Front', zh: '正面' } },
  { value: Facing.Back, label: { en: 'Back', zh: '背面' } },
  { value: Facing.Left, label: { en: 'Left', zh: '左边' } },
  { value: Facing.Right, label: { en: 'Right', zh: '右边' } },
  { value: Facing.Unspecified, label: { en: 'Unspecified', zh: '未指定' } }
]

export const spriteCategoryOptions = [
  { value: SpriteCategory.Character, label: { en: 'Character', zh: '角色' } },
  { value: SpriteCategory.Item, label: { en: 'Item', zh: '物品' } },
  { value: SpriteCategory.Prop, label: { en: 'Prop', zh: '道具' } },
  { value: SpriteCategory.Effect, label: { en: 'Effect', zh: '效果' } },
  { value: SpriteCategory.UI, label: { en: 'UI', zh: 'UI' } },
  { value: SpriteCategory.Unspecified, label: { en: 'Unspecified', zh: '未指定' } }
]

export const backdropCategoryOptions = [
  { value: BackdropCategory.UI, label: { en: 'UI', zh: 'UI' } },
  { value: BackdropCategory.Unspecified, label: { en: 'Unspecified', zh: '未指定' } }
]

export const loopModeOptions = [
  { value: AnimationLoopMode.Loopable, label: { en: 'Loopable', zh: '可循环' } },
  { value: AnimationLoopMode.NonLoopable, label: { en: 'Non Loopable', zh: '不可循环' } }
]
