import Konva from 'konva'
import type { TransformerConfig } from 'konva/lib/shapes/Transformer'
import transformerFlipArrowPng from './transformer-flip-arrow.png'
import transformerFlipArrowDisabledPng from './transformer-flip-arrow-disabled.png'
import rotatorCirclePng from './rotate-circle.png'
import configorPng from './configor.png'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import { normalizeDegree, round } from '@/utils/utils'

// There seems to be an issue rendering svg Image.
// We are using 2x png here.

const transformerFlipArrowImg = new Image()
transformerFlipArrowImg.src = transformerFlipArrowPng

const transformerFlipArrowDisabledImg = new Image()
transformerFlipArrowDisabledImg.src = transformerFlipArrowDisabledPng

const rotatorCircleImg = new Image()
rotatorCircleImg.src = rotatorCirclePng

const configorImg = new Image()
configorImg.src = configorPng

export type CustomTransformerConfig = {
  rotationStyle?: 'none' | 'normal' | 'left-right'
} & Pick<TransformerConfig, 'centeredScaling'>

class RotatorTag extends Konva.Group {
  text: Konva.Text
  constructor() {
    super()

    // Offset the elements to make the rotation center visually centered.
    const text = new Konva.Text({
      text: '',
      width: 42,
      fontSize: 12,
      fill: '#fff',
      x: -21,
      y: -5,
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
    this.text.text(`${normalizeDegree(round(rotationNumber + 90))}°`)
  }
}

class ConfigorButton extends Konva.Group {
  rect: Konva.Rect
  image: Konva.Image

  constructor() {
    super()

    this.rect = new Konva.Rect({
      width: 20,
      height: 20,
      cornerRadius: 10,

      shadowEnabled: true,
      shadowColor: 'rgba(51, 51, 51, 0.2)',
      shadowBlur: 4,
      shadowOffsetY: 2,

      stroke: 'rgba(217, 223, 229, 1)',
      strokeWidth: 0.5,
      fill: '#fff'
    })

    const setCursor = (cursor: string) => {
      const content = this.getStage()?.content
      if (content) {
        content.style.cursor = cursor
      }
    }
    this.on('mouseenter', () => {
      setCursor('pointer')
    })
    this.on('mouseout', () => {
      setCursor('')
    })

    this.image = new Konva.Image({
      width: 12,
      height: 12,
      x: 4,
      y: 4,
      cornerRadius: 10,

      image: configorImg
    })

    this.add(this.rect, this.image)
  }
}

class FlipButton extends Konva.Group {
  orientation: 'left' | 'right'
  rect: Konva.Rect
  image: Konva.Image

  declare _cursorChange: boolean

  constructor(orientation: 'left' | 'right', onClick?: () => void) {
    super()

    // The enabled button is always 'left' because of how we implement flip.
    // We implement flip by rotating 180 degrees and flipping the scaleY.
    // However, scaleY flip is not applied to Transformer's elements,
    // so the transformer elements like FlipButton are only rotated 180 degrees,
    // making the left button visually the right button.
    const enabled = orientation === 'left'

    this.orientation = orientation

    const rectStyle: RectConfig = {
      width: 20,
      height: 20,
      cornerRadius: 10,

      shadowEnabled: true,
      shadowColor: 'rgba(51, 51, 51, 0.2)',
      shadowBlur: 4,
      shadowOffsetY: 2,

      stroke: 'rgba(217, 223, 229, 1)',
      strokeWidth: 0.5
    }
    const imageStyle: Partial<ImageConfig> = {
      width: 6,
      height: 8
    }
    this.rect = new Konva.Rect({
      fill: enabled ? '#fff' : 'rgba(234, 239, 243, 1)',
      ...rectStyle
    })
    const setCursor = (cursor: string) => {
      const content = this.getStage()?.content
      if (content) {
        content.style.cursor = cursor
      }
    }

    this.rect.on('mouseenter', () => {
      setCursor(enabled ? 'pointer' : 'not-allowed')
    })
    this.rect.on('mouseout', () => {
      setCursor('')
    })

    this.image = new Konva.Image({
      ...imageStyle,
      image: enabled ? transformerFlipArrowImg : transformerFlipArrowDisabledImg,
      rotation: enabled ? 180 : 0,
      x: enabled ? 12 : 9,
      y: enabled ? 14 : 6
    })
    this.image.on('mouseenter', () => {
      setCursor(enabled ? 'pointer' : 'not-allowed')
    })

    this.add(this.rect, this.image)
    if (enabled) {
      this.on('click', (e) => {
        e.cancelBubble = true
        onClick?.()
      })
    }
  }
}

export class CustomTransformer extends Konva.Transformer {
  flipButtons: {
    left: FlipButton
    right: FlipButton
  }
  rotatorTag: RotatorTag
  configorButton: ConfigorButton

  rotationStyle(attr?: CustomTransformerConfig['rotationStyle']): CustomTransformerConfig['rotationStyle'] {
    if (!attr) return this.getAttr('rotationStyle')
    this.setAttr('rotationStyle', attr)
  }

  constructor(config: CustomTransformerConfig = {}) {
    const transformerConfig: TransformerConfig = {
      // Makes the transformer still selected for current node even if the user
      // clicks on another node on top of it.
      shouldOverdrawWholeArea: true,

      // Prevents negative scale.
      flipEnabled: false,

      keepRatio: true,

      borderStroke: 'rgba(10, 165, 190, 1)',
      rotateLineVisible: false,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      anchorSize: 11,
      rotateAnchorCursor: 'grab',
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
      const node = this._nodes[0]

      // Instead of setting scaleX to *= -1, we do a rotation of 180 degrees and flip the scaleY.
      // This is visually the same.
      // For more details, refer to stage-viewer/SpriteItem.vue, line 94.
      // We need mutate the rotation to match the left-right flip logic in the editor,
      // as it decides the flip based on the rotation only.
      node.scaleY(node.scaleY() * -1)
      node.rotation(node.rotation() - 180)
      node._fire('transformend', { target: node })
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

    this.configorButton = new ConfigorButton()
    this.add(this.configorButton)
    this.configorButton.on('click', () => {
      const node = this.getNode()
      node.fire('openconfigor')
    })

    const rotator = this.children.find((n) => n.name().match(/rotater/))
    if (!(rotator instanceof Konva.Rect)) {
      throw new Error('rotator rect not found')
    }
    const setCursor = (cursor: string) => {
      const content = rotator.getStage()?.content
      if (content) {
        content.style.cursor = cursor
      }
    }
    let dragging = false
    rotator.on('mousedown touchstart', () => {
      this.rotatorTag.visible(true)
      dragging = true
      setCursor('grabbing')
    })
    rotator.on('mouseout', () => {
      if (!dragging) return
      // Konva.Transformer resets the pointer to '', and we need to override that.
      setCursor('grabbing')
    })
    this.on('transformend', () => {
      this.rotatorTag.visible(false)
      setCursor('')
      dragging = false
    })
    this.on('rotationStyleChange', () => {
      this.update()
    })
  }

  update(): void {
    super.update()
    {
      const { left, right } = this.flipButtons
      if (this.rotationStyle() === 'left-right') {
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

    this.configorButton.x(this.width() / 2 - 10)
    this.configorButton.y(this.height() + 4)
    this.configorButton.visible(true)

    if (this.rotationStyle() === 'normal') {
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
