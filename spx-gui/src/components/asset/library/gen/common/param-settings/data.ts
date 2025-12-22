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
  { value: Facing.Front, label: { en: 'Frong', zh: '正面' } },
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

export const backdropParamSettings = {
  category: {
    options: backdropCategoryOptions,
    tips: { en: 'Please select the backdrop category you want to generate', zh: '请选择您想要生成的背景类别' }
  },
  artStyle: {
    options: artStyleOptions,
    tips: { en: 'Please select the art style you want to generate', zh: '请选择您想要生成的艺术风格' }
  },
  perspective: {
    options: perspectiveOptions,
    tips: { en: 'Please select the perspective you want to generate', zh: '请选择您想要生成的视角' }
  }
}

export const spriteParamSettings = {
  category: {
    options: spriteCategoryOptions,
    tips: { en: 'Please select the sprite category you want to generate', zh: '请选择您想要生成的精灵类别' }
  },
  artStyle: {
    options: artStyleOptions,
    tips: { en: 'Please select the art style you want to generate', zh: '请选择您想要生成的艺术风格' }
  },
  perspective: {
    options: perspectiveOptions,
    tips: { en: 'Please select the perspective you want to generate', zh: '请选择您想要生成的视角' }
  }
}

export const costumeParamSettings = {
  facing: {
    options: facingOptions,
    tips: { en: 'Please select which side your costume is facing', zh: '请选择造型面向哪一边' }
  },
  artStyle: {
    options: artStyleOptions,
    tips: { en: 'Please select the art style you want to generate', zh: '请选择您想要生成的艺术风格' }
  },
  perspective: {
    options: perspectiveOptions,
    tips: { en: 'Please select the perspective you want to generate', zh: '请选择您想要生成的视角' }
  }
}

export const animationParamSettings = {
  artStyle: {
    options: artStyleOptions,
    tips: { en: 'Please select the art style you want to generate', zh: '请选择您想要生成的艺术风格' }
  },
  perspective: {
    options: perspectiveOptions,
    tips: { en: 'Please select the perspective you want to generate', zh: '请选择您想要生成的视角' }
  },
  loopMode: {
    options: loopModeOptions,
    tips: { en: 'Please select the loop mode you want to generate', zh: '请选择您想要生成的循环模式' }
  }
}
