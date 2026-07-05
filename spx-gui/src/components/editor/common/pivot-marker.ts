import type { CircleConfig } from 'konva/lib/shapes/Circle'
import type { GroupConfig } from 'konva/lib/Group'
import type { RectConfig } from 'konva/lib/shapes/Rect'

type PivotMarkerOptions = {
  size?: number
  interactive: boolean
}

export type PivotMarkerShapeConfig =
  | {
      kind: 'circle'
      config: CircleConfig
    }
  | {
      kind: 'rect'
      config: RectConfig
    }

function getPrimaryColor(interactive: boolean) {
  return interactive ? '#36C2CF' : '#CBD2D8'
}

function getOpacity(interactive: boolean) {
  return interactive ? 1 : 0.9
}

const defaultPivotMarkerSize = 16
const pivotMarkerViewBoxSize = 24

export function getPivotMarkerConfigs({ size = defaultPivotMarkerSize, interactive }: PivotMarkerOptions): {
  drawingGroup: GroupConfig
  shapes: PivotMarkerShapeConfig[]
} {
  const scale = size / pivotMarkerViewBoxSize
  const primaryColor = getPrimaryColor(interactive)
  return {
    drawingGroup: {
      x: (-pivotMarkerViewBoxSize / 2) * scale,
      y: (-pivotMarkerViewBoxSize / 2) * scale,
      scale: {
        x: scale,
        y: scale
      },
      opacity: getOpacity(interactive),
      listening: interactive
    },
    shapes: [
      // Interactive marker needs a solid hit area; visible pieces are too sparse for reliable dragging.
      ...(interactive
        ? [
            {
              kind: 'circle' as const,
              config: {
                x: pivotMarkerViewBoxSize / 2,
                y: pivotMarkerViewBoxSize / 2,
                radius: pivotMarkerViewBoxSize / 2,
                fill: 'rgba(0, 0, 0, 0)'
              }
            }
          ]
        : []),
      {
        kind: 'circle',
        config: {
          x: pivotMarkerViewBoxSize / 2,
          y: pivotMarkerViewBoxSize / 2,
          radius: 9,
          fill: 'white'
        }
      },
      ...[
        { x: 0, y: 10, width: 4, height: 4, cornerRadius: 2, fill: 'white' },
        { x: 20, y: 10, width: 4, height: 4, cornerRadius: 2, fill: 'white' },
        { x: 10, y: 0, width: 4, height: 4, cornerRadius: 2, fill: 'white' },
        { x: 10, y: 20, width: 4, height: 4, cornerRadius: 2, fill: 'white' },
        { x: 1, y: 11, width: 4, height: 2, cornerRadius: 1, fill: primaryColor },
        { x: 19, y: 11, width: 4, height: 2, cornerRadius: 1, fill: primaryColor },
        { x: 11, y: 1, width: 2, height: 4, cornerRadius: 1, fill: primaryColor },
        { x: 11, y: 19, width: 2, height: 4, cornerRadius: 1, fill: primaryColor },
        { x: 9, y: 11, width: 6, height: 2, cornerRadius: 1, fill: primaryColor },
        { x: 11, y: 9, width: 2, height: 6, cornerRadius: 1, fill: primaryColor }
      ].map((config) => ({ kind: 'rect' as const, config })),
      {
        kind: 'circle',
        config: {
          x: pivotMarkerViewBoxSize / 2,
          y: pivotMarkerViewBoxSize / 2,
          radius: 7,
          stroke: primaryColor,
          strokeWidth: 2
        }
      }
    ]
  }
}
