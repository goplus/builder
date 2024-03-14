/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-03-08 22:15:52
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-13 14:04:58
 * @FilePath: \builder\spx-gui\src\components\stage-viewer\common.ts
 * @Description:
 */
import type { KonvaEventObject, Node } from 'konva/lib/Node'
import type { Sprite } from '@/class/sprite'

/**
 * @description: Costume
 */
export interface StageCostume {
  name: string
  x: number
  y: number
  url: string
}

/**
 * @description: Scene of Backdrop
 */
export interface StageScene {
  name: string
  url: string
}
/**
 * @description: Backdrop
 */
export interface StageBackdrop {
  scenes: StageScene[]
  costumes: StageCostume[]
  currentCostumeIndex: number
}
/**
 * @description: Map Config,some spx project havent this config,the stage size will depend on the SceneSize
 */
export interface MapConfig {
  width: number
  height: number
}

export interface SpriteEvent {
  sprite: Sprite
}

export interface SpriteApperanceChangeEvent extends SpriteEvent {
  sprite: Sprite
  node: Node
}

export interface SpriteDragMoveEvent extends SpriteEvent {
  event: KonvaEventObject<MouseEvent>
}
