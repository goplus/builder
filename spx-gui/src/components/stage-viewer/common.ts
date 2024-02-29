import type { KonvaEventObject } from "konva/lib/Node";
import type { Sprite } from "@/class/sprite";


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


export interface SpriteDragMoveEvent {
    event: KonvaEventObject<MouseEvent>
    sprite: Sprite
}