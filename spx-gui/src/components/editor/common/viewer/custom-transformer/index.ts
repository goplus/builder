import Konva from 'konva'
import type { TransformerConfig } from 'konva/lib/shapes/Transformer'
import transformerFlipArrowPng from './transformer-flip-arrow.png'
import transformerFlipArrowDisabledPng from './transformer-flip-arrow-disabled.png'
import rotatorCirclePng from './rotate-circle.png'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import type { Vector2d } from 'konva/lib/types'
import { getPivotMarkerConfigs } from '../../pivot-marker'

// There seems to be an issue rendering svg Image.
// We are using 2x png here.

const transformerFlipArrowImg = new Image()
transformerFlipArrowImg.src = transformerFlipArrowPng

const transformerFlipArrowDisabledImg = new Image()
transformerFlipArrowDisabledImg.src = transformerFlipArrowDisabledPng

const rotatorCircleImg = new Image()
rotatorCircleImg.src = rotatorCirclePng

export type TransformOp = 'rotate' | 'scale' | 'move' | 'flip'

export type TransformerOrigin =
  /** Keep the anchor opposite to the dragged anchor fixed. */
  | 'opposite-anchor'
  /** Use the transformer's geometric center as the transform origin. */
  | 'center'
  /** Use the single bound node's local origin, i.e. node.getAbsolutePosition(), as the transform origin. */
  | 'node-origin'

export type CustomTransformerConfig = {
  rotationStyle?: 'none' | 'normal' | 'left-right'
  scaleOrigin?: TransformerOrigin
  rotationOrigin?: Exclude<TransformerOrigin, 'opposite-anchor'>
  originMarker?: 'scaleOrigin' | 'rotationOrigin'
} & Pick<TransformerConfig, 'keepRatio'>

type TransformerBox = {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

type OriginRatio = {
  x: number
  y: number
}

const cornerAnchorRatios: Record<string, OriginRatio> = {
  'top-left': { x: 0, y: 0 },
  'top-right': { x: 1, y: 0 },
  'bottom-left': { x: 0, y: 1 },
  'bottom-right': { x: 1, y: 1 }
}

function rotatePoint(point: Vector2d, rotation: number): Vector2d {
  return {
    x: point.x * Math.cos(rotation) - point.y * Math.sin(rotation),
    y: point.y * Math.cos(rotation) + point.x * Math.sin(rotation)
  }
}

function boxLocalToAbsolute(box: TransformerBox, point: Vector2d): Vector2d {
  const rotated = rotatePoint(point, box.rotation)
  return {
    x: box.x + rotated.x,
    y: box.y + rotated.y
  }
}

function absoluteToBoxLocal(box: TransformerBox, point: Vector2d): Vector2d {
  return rotatePoint(
    {
      x: point.x - box.x,
      y: point.y - box.y
    },
    -box.rotation
  )
}

function vectorToBoxLocal(box: TransformerBox, vector: Vector2d): Vector2d {
  return rotatePoint(vector, -box.rotation)
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
  originMarkerNode: Konva.Group
  rotationOriginTransformStart: {
    originAbs: Vector2d
    pointerAngle: number
    rotation: number
    originRatio: OriginRatio
  } | null = null

  rotationStyle(attr?: CustomTransformerConfig['rotationStyle']): CustomTransformerConfig['rotationStyle'] {
    if (!attr) return this.getAttr('rotationStyle')
    this.setAttr('rotationStyle', attr)
  }

  scaleOrigin(attr?: CustomTransformerConfig['scaleOrigin']): CustomTransformerConfig['scaleOrigin'] {
    if (attr == null) return this.attrs.scaleOrigin
    this.setAttr('scaleOrigin', attr)
  }

  rotationOrigin(attr?: CustomTransformerConfig['rotationOrigin']): CustomTransformerConfig['rotationOrigin'] {
    if (attr == null) return this.attrs.rotationOrigin
    this.setAttr('rotationOrigin', attr)
  }

  originMarker(attr?: CustomTransformerConfig['originMarker']): CustomTransformerConfig['originMarker'] {
    if (attr == null) return this.attrs.originMarker
    this.setAttr('originMarker', attr)
  }

  private currentScaleOrigin(): TransformerOrigin {
    return this.scaleOrigin() ?? 'opposite-anchor'
  }

  private currentRotationOrigin(): Exclude<TransformerOrigin, 'opposite-anchor'> {
    return this.rotationOrigin() ?? 'center'
  }

  private isSingleNodeOrigin(origin: TransformerOrigin) {
    return origin === 'node-origin' && this.getNodes().length === 1
  }

  // Konva still owns the low-level anchor movement math. Keep its native flag aligned for
  // the two built-in modes, while custom node-origin correction is applied later in _fitNodesInto.
  private syncNativeCenteredScaling() {
    const centered = this.currentScaleOrigin() === 'center'
    if (this.centeredScaling() !== centered) {
      this.centeredScaling(centered)
    }
  }

  // CustomTransformer works with Konva.Transformer's box-local coordinates. Convert each supported
  // origin into a ratio in that box so it can be reapplied after box size/rotation changes.
  private resolveOriginRatio(box: TransformerBox, origin: TransformerOrigin): OriginRatio | null {
    if (origin === 'opposite-anchor') return null
    if (origin === 'center') return { x: 0.5, y: 0.5 }
    if (origin === 'node-origin') {
      const node = this.getNodes()[0]
      if (node == null || box.width === 0 || box.height === 0) return null
      const localPos = absoluteToBoxLocal(box, node.getAbsolutePosition())
      return {
        x: localPos.x / box.width,
        y: localPos.y / box.height
      }
    }
    return null
  }

  private createOriginMarker() {
    const markerConfigs = getPivotMarkerConfigs({ interactive: false })
    const marker = new Konva.Group({ listening: false, visible: false })
    const drawingGroup = new Konva.Group(markerConfigs.drawingGroup)
    drawingGroup.add(
      ...markerConfigs.shapes.map((shape) =>
        shape.kind === 'circle' ? new Konva.Circle(shape.config) : new Konva.Rect(shape.config)
      )
    )
    marker.add(drawingGroup)
    return marker
  }

  constructor(config: CustomTransformerConfig = {}) {
    const scaleOrigin = config.scaleOrigin ?? 'opposite-anchor'
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
      ...config,
      centeredScaling: scaleOrigin === 'center'
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
      node.fire('transformend', { target: node })
    })

    const right = new FlipButton('right')

    this.add(left)
    this.add(right)
    this.originMarkerNode = this.createOriginMarker()
    this.add(this.originMarkerNode)
    this.flipButtons = {
      left,
      right
    }

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
      dragging = true
      setCursor('grabbing')
    })
    rotator.on('mouseout', () => {
      if (!dragging) return
      // Konva.Transformer resets the pointer to '', and we need to override that.
      setCursor('grabbing')
    })
    this.on('transformend', () => {
      setCursor('')
      dragging = false
    })
    this.on('rotationStyleChange', () => {
      this.update()
    })
    this.on('scaleOriginChange', () => {
      this.syncNativeCenteredScaling()
    })
    this.on('scaleOriginChange rotationOriginChange originMarkerChange', () => {
      this.update()
    })
  }

  // Given a desired origin world position and its ratio in the new box, move the box's top-left
  // so that the origin stays fixed after scaling or rotating.
  private adjustBoxToKeepOrigin(box: TransformerBox, originAbs: Vector2d, originRatio: OriginRatio): TransformerBox {
    const originLocal = {
      x: originRatio.x * box.width,
      y: originRatio.y * box.height
    }
    const rotatedOrigin = rotatePoint(originLocal, box.rotation)
    return {
      ...box,
      x: originAbs.x - rotatedOrigin.x,
      y: originAbs.y - rotatedOrigin.y
    }
  }

  private adjustScaleBox(newBox: TransformerBox, oldBox: TransformerBox): TransformerBox {
    const scaleOrigin = this.currentScaleOrigin()
    if (!this.isSingleNodeOrigin(scaleOrigin) || this._movingAnchorName == null) return newBox
    const anchorRatio = cornerAnchorRatios[this._movingAnchorName]
    if (anchorRatio == null || oldBox.width === 0 || oldBox.height === 0) return newBox
    const originRatio = this.resolveOriginRatio(oldBox, scaleOrigin)
    if (originRatio == null) return newBox
    // Konva first builds a candidate box from the dragged anchor. Recompute its size from the
    // dragged anchor relative to the fixed node-origin, then move the box back so that origin stays fixed.
    const fixedOriginAbs = boxLocalToAbsolute(oldBox, {
      x: oldBox.width * originRatio.x,
      y: oldBox.height * originRatio.y
    })
    const anchorAbs = boxLocalToAbsolute(newBox, {
      x: newBox.width * anchorRatio.x,
      y: newBox.height * anchorRatio.y
    })
    const anchorVector = vectorToBoxLocal(newBox, {
      x: anchorAbs.x - fixedOriginAbs.x,
      y: anchorAbs.y - fixedOriginAbs.y
    })
    const aspectRatio = Math.abs(oldBox.height / oldBox.width)
    const widthBasis = {
      x: anchorRatio.x - originRatio.x,
      y: (anchorRatio.y - originRatio.y) * aspectRatio
    }
    const basisLengthSquared = widthBasis.x ** 2 + widthBasis.y ** 2
    if (basisLengthSquared === 0) return newBox
    const nextWidth = (anchorVector.x * widthBasis.x + anchorVector.y * widthBasis.y) / basisLengthSquared
    if (!Number.isFinite(nextWidth)) return newBox
    const width = Math.max(1, Math.abs(nextWidth))
    const height = width * aspectRatio
    return this.adjustBoxToKeepOrigin(
      {
        ...newBox,
        width,
        height
      },
      fixedOriginAbs,
      originRatio
    )
  }

  private adjustRotationBox(newBox: TransformerBox, oldBox: TransformerBox): TransformerBox {
    const rotationOrigin = this.currentRotationOrigin()
    if (!this.isSingleNodeOrigin(rotationOrigin)) return newBox
    const originRatio =
      this.rotationOriginTransformStart?.originRatio ?? this.resolveOriginRatio(oldBox, rotationOrigin)
    const originAbs =
      this.rotationOriginTransformStart?.originAbs ??
      (originRatio != null
        ? boxLocalToAbsolute(oldBox, {
            x: oldBox.width * originRatio.x,
            y: oldBox.height * originRatio.y
          })
        : null)
    if (originRatio == null || originAbs == null) return newBox
    const stage = this.getStage()
    const pointerPos = stage?.getPointerPosition()
    if (pointerPos != null && this.rotationOriginTransformStart != null) {
      // Native Konva rotation is center-based. Recompute rotation from the pointer angle around
      // the fixed node-origin captured at transform start, then keep that origin fixed in the new box.
      const pointerAngle = Math.atan2(pointerPos.y - originAbs.y, pointerPos.x - originAbs.x)
      let rotation =
        this.rotationOriginTransformStart.rotation + pointerAngle - this.rotationOriginTransformStart.pointerAngle
      const tolerance = Konva.getAngle(this.rotationSnapTolerance())
      for (const snap of this.rotationSnaps()) {
        const snapRotation = Konva.getAngle(snap)
        const diff = Math.abs(snapRotation - rotation) % (Math.PI * 2)
        if (Math.min(diff, Math.PI * 2 - diff) < tolerance) {
          rotation = snapRotation
        }
      }
      newBox = {
        ...newBox,
        rotation
      }
    }
    return this.adjustBoxToKeepOrigin(newBox, originAbs, originRatio)
  }

  // Override Konva.Transformer internal method. Re-check this when upgrading Konva.
  _handleMouseDown(e: any): void {
    super._handleMouseDown(e)
    if (this._movingAnchorName !== 'rotater') return
    const rotationOrigin = this.currentRotationOrigin()
    if (!this.isSingleNodeOrigin(rotationOrigin)) {
      this.rotationOriginTransformStart = null
      return
    }
    const stage = this.getStage()
    const pointerPos = stage?.getPointerPosition()
    if (pointerPos == null) return
    const box = this._getNodeRect()
    const originRatio = this.resolveOriginRatio(box, rotationOrigin)
    if (originRatio == null) return
    // Capture the initial pointer angle around the fixed origin. Rotation updates use this baseline
    // instead of Konva's center-based rotater delta.
    const originAbs = boxLocalToAbsolute(box, {
      x: box.width * originRatio.x,
      y: box.height * originRatio.y
    })
    this.rotationOriginTransformStart = {
      originAbs,
      originRatio,
      pointerAngle: Math.atan2(pointerPos.y - originAbs.y, pointerPos.x - originAbs.x),
      rotation: box.rotation
    }
  }

  // Override Konva.Transformer internal method. Re-check this when upgrading Konva.
  _fitNodesInto(newAttrs: TransformerBox, evt?: any): void {
    // This is the single place where Konva applies a transformed box back to bound nodes. Adjust the
    // candidate box here so both scaling and rotation can support a custom node-origin without
    // reimplementing the rest of Konva.Transformer's interaction handling.
    const oldAttrs = this._getNodeRect()
    let nextAttrs = { ...newAttrs }
    if (this._movingAnchorName === 'rotater') {
      nextAttrs = this.adjustRotationBox(nextAttrs, oldAttrs)
    } else {
      nextAttrs = this.adjustScaleBox(nextAttrs, oldAttrs)
    }
    super._fitNodesInto(nextAttrs, evt)
  }

  // Override Konva.Transformer internal method. Re-check this when upgrading Konva.
  _removeEvents(e?: any): void {
    super._removeEvents(e)
    this.rotationOriginTransformStart = null
  }

  private updateOriginMarker() {
    const originMarker = this.originMarker()
    if (originMarker == null) {
      this.originMarkerNode.visible(false)
      return
    }
    const box = this._getNodeRect()
    const origin = originMarker === 'scaleOrigin' ? this.currentScaleOrigin() : this.currentRotationOrigin()
    if (origin === 'node-origin' && !this.isSingleNodeOrigin(origin)) {
      this.originMarkerNode.visible(false)
      return
    }
    const originRatio = this.resolveOriginRatio(box, origin)
    if (originRatio == null) {
      this.originMarkerNode.visible(false)
      return
    }
    this.originMarkerNode.setAttrs({
      x: box.width * originRatio.x,
      y: box.height * originRatio.y,
      rotation: -this.rotation(),
      visible: true
    })
    this.originMarkerNode.moveToTop()
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

    if (this.rotationStyle() === 'normal') {
      this.rotateEnabled(true)
    } else {
      this.rotateEnabled(false)
    }
    this.updateOriginMarker()
  }
}
