
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
    id: string
    name: string
    x: number
    y: number
    url: string
}

/**
 * @description: Sprite of StageViewer
 */
export interface StageSprite extends StagePosition {
    id: string
    name: string
    heading: number
    size: number
    costumes: StageCostume[]
    costumeIndex: number
    visible: boolean // Visible at run time
    stageVisible: boolean // Visible at preview time
    zorder: number
}


/**
 * @description: Scene of Backdrop
 */
export interface StageScene {
    id: string
    name: string
    url: string
}

/**
 * @description: Backdrop 
 */
export interface StageBackdrop {
    scenes: StageScene[]
    sceneIndex: number[]
}
/**
 * @description: Map Config,some spx project havent this config,the stage size will depend on the SceneSize
 */
export interface mapConfig {
    width: number
    height: number
}



/**
 * @description: Sprite Appearance,Use by SpriteAppearanceChangeEvent
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-02 17:19:45
 */
export interface SpriteAppearance {
    sprite: StageSprite // Sprite  witch is changed
    costume: StageCostume // costume witch is changed
    position: StagePosition // position witch is changed
}


/**
 * @description: Prop of StageViewer
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-02 17:18:49
 */
export interface StageViewerProps {
    height?: string // container height
    width?: string // container width
    mapConfig?: mapConfig // some spx project havent this config,the stage size will depend on the SceneSize
    sprites: StageSprite[] // sprite list
    backdrop: StageBackdrop // backdrop 
}

export interface SpriteAppearanceChangeEvent {
    spriteAppearances: SpriteAppearance[]
}

export interface CodeEditorEmits {
    // sprite move event
    (e: 'spriteAppearanceChange', value: SpriteAppearanceChangeEvent): void
}