import StageViewer from "./StageViewer.vue"
export default StageViewer
/**
 * @description:  The Stage Position,Relative to the stage center
 */
export interface StagePosition {
    x: number
    y: number
}

/**
 * @description: Costume of Sprite 
 */
export interface StageCostume {
    name: string
    x: number
    y: number
    url: string
}

/**
 * @description: Sprite of StageViewer
 */
export interface StageSprite extends StagePosition {
    name: string
    heading: number
    size: number
    costumes: StageCostume[]
    costumeIndex: number
    visible: boolean // Visible at run time
    zorder: number
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
    sceneIndex: number
}
/**
 * @description: Map Config,some spx project havent this config,the stage size will depend on the SceneSize
 */
export interface MapConfig {
    width: number
    height: number
}





/**
 * @description: Prop of StageViewer
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-02 17:18:49
 */
export interface StageViewerProps {
    id: string
    height?: number // container height
    width?: number // container width
    mapConfig?: MapConfig // some spx project havent this config,the stage size will depend on the SceneSize
    sprites: StageSprite[] // sprite list
    backdrop?: StageBackdrop // backdrop 
    currentSpriteNames: String[]
}


/**
 * @description: Info of dragend target
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-04 17:20:49
 */
export interface SpriteDragEndTarget {
    sprite: StageSprite // Sprite  witch is changed
    costume: StageCostume // costume witch is changed
    position: StagePosition // end position witch is changed
}

/**
 * @description: sprite dragend event
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-04 17:28:04
 */
export interface SpriteDragEndEvent {
    targets: SpriteDragEndTarget[]
}

export interface StageViewerEmits {
    (e: 'onSpritesDragEnd', value: SpriteDragEndEvent): void
}