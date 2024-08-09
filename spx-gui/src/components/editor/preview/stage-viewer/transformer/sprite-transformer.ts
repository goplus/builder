import { RotationStyle } from '@/models/sprite'
import Konva from 'konva'
import type { TransformerConfig } from 'konva/lib/shapes/Transformer'
import transformerFlipArrowPng from './transformer-flip-arrow.png'
import transformerFlipArrowDisabledPng from './transformer-flip-arrow-disabled.png'
import rotatorCirclePng from './rotate-circle.png'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import { nomalizeDegree, round } from '@/utils/utils'

// There seems to be an issue rendering svg Image.
// We are using 2x png here.

const transformerFlipArrowImg = new Image()
transformerFlipArrowImg.src = transformerFlipArrowPng

const transformerFlipArrowDisabledImg = new Image()
transformerFlipArrowDisabledImg.src = transformerFlipArrowDisabledPng

const rotatorCircleImg = new Image()
rotatorCircleImg.src = rotatorCirclePng

export type SpriteTransformerConfig = {
  spriteRotationStyle?: RotationStyle
  flipFunc?: () => void
}

class RotatorTag extends Konva.Group {
  text: Konva.Text
  constructor() {
    super()

    // Offset the elements to make the rotation center visually centered.
    const text = new Konva.Text({
      text: '235°',
      width: 42,
      fontSize: 12,
      fill: '#fff',
      x: -21,
      y: 3 - 8,
      align: 'center'
    })
    const background = new Konva.Rect({
      x: -21,
      y: -8,
      width: 42,
      height: 16,
      cornerRadius: 8,
      fill: 'rgba(87, 96, 106, 1)'
    })
    this.text = text
    this.add(background, text)
  }

  updateRotationNumber(rotationNumber: number) {
    this.text.text(`${nomalizeDegree(round(rotationNumber + 90))}°`)
  }
}

class FlipButton extends Konva.Group {
  orientation: 'left' | 'right'
  rect: Konva.Rect
  image: Konva.Image

  constructor(orientation: 'left' | 'right', onClick?: () => void) {
    super()

    this.orientation = orientation

    const rectStyle: RectConfig = {
      width: 20,
      height: 20,
      cornerRadius: 10,

      shadowEnabled: true,
      shadowColor: 'rgba(51, 51, 51, 0.2)',
      shadowBlur: 4,
      shadowOffsetY: 2
    }
    const imageStyle: Partial<ImageConfig> = {
      width: 4,
      height: 8
    }
    this.rect = new Konva.Rect({
      fill: orientation === 'left' ? '#fff' : 'rgba(234, 239, 243, 1)',
      ...rectStyle
    })
    this.image = new Konva.Image({
      ...imageStyle,
      image: orientation === 'left' ? transformerFlipArrowImg : transformerFlipArrowDisabledImg,
      rotation: orientation === 'left' ? 180 : 0,
      x: orientation === 'left' ? 11 : 8,
      y: orientation === 'left' ? 14 : 6
    })
    this.add(this.rect, this.image)
    if (this.orientation === 'left') {
      this.on('click', (e) => {
        e.cancelBubble = true
        onClick?.()
      })
    }
  }
}

export class SpriteTransformer extends Konva.Transformer {
  flipButtons: {
    left: FlipButton
    right: FlipButton
  }
  rotatorTag: RotatorTag

  spriteRotationStyle(attr?: RotationStyle): RotationStyle | undefined {
    if (!attr) return this.getAttr('spriteRotationStyle')
    this.setAttr('spriteRotationStyle', attr)
  }

  flipFunc(attr?: () => void): (() => void) | undefined {
    if (!attr) return this.getAttr('flipFunc')
    this.setAttr('flipFunc', attr)
  }

  constructor(config: SpriteTransformerConfig = {}) {
    const transformerConfig: TransformerConfig = {
      borderStroke: 'rgba(10, 165, 190, 1)',
      rotateLineVisible: false,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      // rotateAnchorOffset: 4 + 20 / 2,
      anchorStyleFunc: (anchor) => {
        const rect = anchor as Konva.Rect
        rect.shadowEnabled(true)
        rect.shadowColor('rgba(51, 51, 51, 0.2)')
        rect.shadowBlur(4)
        rect.shadowOffsetY(2)
        rect.strokeWidth(0.5)
        rect.stroke('rgba(217, 223, 229, 1)')

        if (rect.name().match(/rotater/)) {
          // Actually a typo in Konva.Transformer code (rotator)
          rect.width(20)
          rect.height(20)
          rect.cornerRadius(20 / 2)
          rect.fill('')
          rect.fillPatternImage(rotatorCircleImg)
          rect.fillPatternScaleX(0.5)
          rect.fillPatternScaleY(0.5)
          rect.x(this.width() / 2 - 5)
          rect.y(-15 - 4)
        } else {
          rect.width(11)
          rect.height(11)
          rect.cornerRadius(11 / 2)
        }
      }
    }
    super({
      ...transformerConfig,
      ...config
    })

    const left = new FlipButton('left', () => {
      this.flipFunc()?.()
    })

    const right = new FlipButton('right')

    this.add(left)
    this.add(right)
    this.flipButtons = {
      left,
      right
    }

    this.rotatorTag = new RotatorTag()
    this.rotatorTag.visible(false)
    this.add(this.rotatorTag)

    const rotator = this.children.find((n) => n.name().match(/rotater/))
    if (!(rotator instanceof Konva.Rect)) {
      throw new Error('rotator rect not found')
    }
    rotator.on('mousedown touchstart', () => {
      this.rotatorTag.visible(true)
    })
    this.on('transformend', () => {
      this.rotatorTag.visible(false)
    })
    this.on(['flipFuncChange', 'spriteRotateStyleChange'].join(' '), () => this.update())
  }

  update(): void {
    super.update()
    {
      const { left, right } = this.flipButtons
      if (this.spriteRotationStyle() === RotationStyle.leftRight) {
        left.x(-10)
        left.y(this.height() / 2 - 10)
        left.visible(true)

        right.x(this.width() - 10)
        right.y(this.height() / 2 - 10)
        right.visible(true)
      } else {
        left.visible(false)
        right.visible(false)
      }
    }

    if (this.spriteRotationStyle() === RotationStyle.normal) {
      this.rotateEnabled(true)
    } else {
      this.rotateEnabled(false)
    }

    this.rotatorTag.rotation(-this.rotation())
    this.rotatorTag.updateRotationNumber(this.rotation())
    this.rotatorTag.x(this.width() / 2)
    this.rotatorTag.y(-35)
  }
}
