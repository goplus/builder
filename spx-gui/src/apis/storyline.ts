import type { LocaleMessage } from "@/utils/i18n";
import type { Position } from "@/components/editor/code-editor/common";

export type Mask = {
    startPos: Position
    endPos: Position
}

export type Placement = {
    /** X position in percentage */
    x: number
    /** Y position in percentage */
    y: number
}

export type Step = {
    title: LocaleMessage
    description: LocaleMessage
    /** Interactive prompt (conditional trigger required) */
    tip: LocaleMessage
    /** Duration of the user's current step delay (unit: second) */
    duration: number
    /** key of the target element semantically annotated */
    target: string[]
    /** There are two types of steps, the Following step and the Coding step */
    type: 'coding' | 'following'
    /** Check whether this step involves snapshot comparison */
    isCheck: boolean
    isApiControl: boolean
    apis: string[]
    isAssetControl: boolean
    assets: string[]
    isSpriteControl: boolean
    sprites: string[]
    isSoundControl: boolean
    sounds: string[]
    isCostumeControl: boolean
    costumes: string[]
    isAnimationControl: boolean
    animations: string[]
    isWidgetControl: boolean
    widgets: string[]
    isBackdropControl: boolean
    backdrops: string[]
    snapshot: {
        startSnapshot: string
        endSnapshot?: string
    }
    /** Data structure unique to the coding task */
    coding?: {
        /** Coded file path */
        path: string
        /** Cloze an array of masks, one mask for one empty answer */
        codeMasks: Mask[]
        /** The beginning position of the answer display */
        startPosition: Position
        /** The end position of the answer display */
        endPosition: Position
    }
}

export type NodeTask = {
    name: LocaleMessage
    /** Trigger time of the node in the video (unit: second) */
    triggerTime: number
    video: string
    steps: Step[]
}

export type Level = {
    /** Cover image url */
    cover: string
    /** Position information on the interface 
     * (the position of the level placement in each storyline is not determined and is manually specified) 
     **/
    placement: Placement
    title: LocaleMessage
    description: LocaleMessage
    /** The overall video url of the level (spliced from the video of NodeTask) */
    video: string
    achievement: {
        icon: string
        title: LocaleMessage
    }
    nodeTasks: NodeTask[]
}

export type StoryLine = {
    id: string
    backgroundImage: string
    /** The name of the story line 
     * (a projectName that uniquely identifies the story line and can be used when creating a project for the user)
     **/
    name: string
    title: LocaleMessage
    description: LocaleMessage
    /** Storyline Difficulty tag */
    tag: 'easy' | 'medium' | 'hard'
    levels: Level[]
}

export type StoryLineStudy = {
    storyLineId: string
    /** Storyline status, the value of which is the current most recently completed level subscript */
    lastFinishedLevelIndex: number
}

const storyLineJson = 
{
    "id": "1",
    "backgroundImage": "http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/road-background.png",
    "name": "road",
    "title": {
        "zh": "过马路",
        "en": "Cross the Road"
    },
    "description": {
        "zh": "《过马路》是一款简单有趣的休闲游戏，玩家需要操控角色避开来往车辆，成功穿越马路。游戏玩法简单易上手，适合各年龄段玩家。",
        "en": "\"Cross the Road\" is a simple yet fun casual game. Players control a character to avoid oncoming traffic and successfully cross the street. it's suitable for all ages."
    },
    "tag": "easy",
    "levels": [
        {
            "cover": "http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/green.png",
            "placement": {
                "x": 30,
                "y": 50
            },
            "title": {
                "zh": "创建精灵和背景.",
                "en": "Create a sprite and a background."
            },
            "description": {
                "zh": "创建精灵和背景，让你的项目栩栩如生。精灵可以是一个角色或物体，背景则为场景设定基调。你可以通过颜色、图片或动画对它们进行自定义，让你的作品独一无二。",
                "en": "Create sprites and backgrounds to bring your project to life. The Sprite can be a character or object, and the background sets the tone for the scene. You can customize them with colors, pictures, or animations to make your creations unique."
            },
            "video": "http://ssbvnda4w.hn-bkt.clouddn.com/qny/video/spirit%26backdrop.mkv",
            "achievement": {
                "icon": "http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/primacy.png",
                "title": {
                    "zh": "初级",
                    "en": "primary"
                }
            },
            "nodeTasks": [
                {
                    "name": {
                        "zh": "创建精灵",
                        "en": "Create Sprite"
                    },
                    "triggerTime": 41,
                    "video": "",
                    "steps": [
                        {
                            "title": {
                                "zh": "点击素材库",
                                "en": "click asset library"
                            },
                            "description": {
                                "zh": "素材库里会存在由系统提供的丰富素材，点击素材库，选择你所喜欢的素材！",
                                "en": "The asset library contains a rich collection of resources provided by the system. Click on the asset library and choose your favorite ones!"
                            },
                            "tip": {
                                "zh": "请点击此处，打开素材库",
                                "en": "Please click here to open the asset library."
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl":false,
                            "isAssetControl": false,
                            "isSpriteControl":  false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\"}",
                                "endSnapshot": ""
                            }
                        },
                        {
                            "title": {
                                "zh": "选择精灵1",
                                "en": "Select Sprite 1"
                            },
                            "description": {
                                "zh": "在素材库中通过点击鼠标左键选择精灵！",
                                "en": "Select the sprite by clicking the left mouse button in the asset library!"
                            },
                            "tip": {
                                "zh": "请用鼠标左键点击此处，选择精灵1",
                                "en": "Please click here with the left mouse button to select Sprite 1."
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl": false,
                            "isAssetControl": true,
                            "isSpriteControl": false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [
                                "11122",
                                "10885"
                            ],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\"}",
                                "endSnapshot": ""
                            }
                        },
                        {
                            "title": {
                                "zh": "选择精灵2",
                                "en": "Select Sprite 2"
                            },
                            "description": {
                                "zh": "素材库中可以一次性勾选多个精灵。勾选你的第二个精灵。",
                                "en": "In the material library, you can select multiple sprites at once. Check your second sprite."
                            },
                            "tip": {
                                "zh": "素材库中可以一次性勾选多个精灵！点击此处，选择你的第二个精灵吧！",
                                "en": "You can select multiple sprites at once in the asset library! Click here to choose your second sprite!"
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl": false,
                            "isAssetControl": true,
                            "isSpriteControl": false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [
                                "11122",
                                "10885"
                            ],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\"}",
                                "endSnapshot": ""
                            }
                        },
                        {
                            "title": {
                                "zh": "点击确定按钮",
                                "en": "Click OK button"
                            },
                            "description": {
                                "zh": "点击确定按钮",
                                "en": "Click OK button"
                            },
                            "tip": {
                                "zh": "请点击此处确定按钮",
                                "en": "Click OK button"
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": true,
                            "isApiControl":false,
                            "isAssetControl": true,
                            "isSpriteControl":  false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [
                                "11122",
                                "10885"
                            ],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\"}",
                                "endSnapshot": "{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\",\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\",\"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\",\"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\",\"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\",\"WizardBlue.spx\": \"data:;,\",\"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.7003891050583657%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\",\"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\",\"Convertible.spx\": \"data:;,\",\"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.15748031496062992%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}"
                            }
                        }
                    ]
                },
                {
                    "name": {
                        "zh": "创建背景",
                        "en": "Create backdrop"
                    },
                    "triggerTime": 60,
                    "video": "",
                    "steps": [
                        {
                            "title": {
                                "zh": "点击舞台",
                                "en": "Click the stage."
                            },
                            "description": {
                                "zh": "点击舞台",
                                "en": "Click the stage."
                            },
                            "tip": {
                                "zh": "请点击此处，切换到舞台",
                                "en": "Please click here to switch to the stage."
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl":false,
                            "isAssetControl": false,
                            "isSpriteControl":  false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\",\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\",\"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\",\"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\",\"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\",\"WizardBlue.spx\": \"data:;,\",\"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.7003891050583657%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\",\"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\",\"Convertible.spx\": \"data:;,\",\"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.15748031496062992%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}",
                                "endSnapshot": ""
                            }
                        },
                        {
                            "title": {
                                "zh": "点击背景",
                                "en": "Click the backdrop"
                            },
                            "description": {
                                "zh": "点击背景",
                                "en": "Click the backdrop"
                            },
                            "tip": {
                                "zh": "请点击此处，切换到背景",
                                "en": "Please click here to switch to the backdrop."
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl":false,
                            "isAssetControl": false,
                            "isSpriteControl":  false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\",\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\",\"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\",\"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\",\"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\",\"WizardBlue.spx\": \"data:;,\",\"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.7003891050583657%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\",\"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\",\"Convertible.spx\": \"data:;,\",\"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.15748031496062992%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}",
                                "endSnapshot": ""
                            }
                        },
                        {
                            "title": {
                                "zh": "点击\"+\"号",
                                "en": "Click the \"+\" button."
                            },
                            "description": {
                                "zh": "点击\"+\"号",
                                "en": "Click the \"+\" button."
                            },
                            "tip": {
                                "zh": "请点击此处，添加背景",
                                "en": "Please click here to add a backdrop."
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl":false,
                            "isAssetControl": false,
                            "isSpriteControl":  false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\",\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\",\"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\",\"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\",\"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\",\"WizardBlue.spx\": \"data:;,\",\"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.7003891050583657%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\",\"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\",\"Convertible.spx\": \"data:;,\",\"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.15748031496062992%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}",
                                "endSnapshot": ""
                            }
                        }
                    ]
                }
            ]
        },
        {
            "cover": "http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/green.png",
            "placement": {
                "x": 70,
                "y": 50
            },
            "title": {
                "zh": "编写相关代码.",
                "en": "Write relevant code."
            },
            "description": {
                "zh": "编写相关代码.",
                "en": "Write relevant code."
            },
            "video": "http://ssbvnda4w.hn-bkt.clouddn.com/qny/video/coding-person.mkv",
            "achievement": {
                "icon": "http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/senior.png",
                "title": {
                    "zh": "高级",
                    "en": "senior"
                }
            },
            "nodeTasks": [
                {
                    "name": {
                        "zh": "编写与人相关的代码.",
                        "en": "Write human-related code."
                    },
                    "triggerTime": 55,
                    "video": "",
                    "steps": [
                        {
                            "title": {
                                "zh": "编写代码",
                                "en": "Write relevant code."
                            },
                            "description": {
                                "zh": "编写与人相关的代码",
                                "en": "Write human-related code."
                            },
                            "tip": {
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "coding",
                            "isCheck": true,
                            "isApiControl":true,
                            "apis": [
                                "gop:github.com/goplus/spx?Game.onStart",
                                "gop:github.com/goplus/spx?Sprite.think#1",
                                "gop:github.com/goplus/spx?Game.broadcast#0",
                                "gop:github.com/goplus/spx?Sprite.onTouchStart#0",
                                "gop:github.com/goplus/spx?Sprite.die",
                                "gop:github.com/goplus/spx?Game.onKey#0",
                                "gop:github.com/goplus/spx?Sprite.setHeading",
                                "gop:github.com/goplus/spx?Sprite.step#0"
                            ],
                            "isAssetControl": false,
                            "isSpriteControl":  true,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "assets": [],
                            "sprites": [
                                "WizardBlue"
                            ],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": "{\"startSnapshot\": \"{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22City%22%2C%22path%22%3A%22City.png%22%2C%22builder_id%22%3A%224Z7HpVxGWDUaa9xpAhp4m%22%7D%5D%2C%22backdropIndex%22%3A1%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\", \"main.spx\": \"data:;,\", \"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\", \"assets/City.png\": \"kodo://goplus-builder-usercontent-test/files/Fpa4N41zCy22Iz3-IgOJAsIfEo84-139687\", \"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\", \"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\", \"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\", \"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\", \"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\", \"WizardBlue.spx\": \"data:;,onStart%20%3D%3E%20%7B%0D%0A%09__%20%22%E5%A6%82%E4%BD%95%E9%80%9A%E8%BF%87%E6%96%91%E9%A9%AC%E7%BA%BF%E5%91%A2%EF%BC%9F%22%2C%20__%0D%0A%09__%20%22start%22%0D%0A%7D%0D%0A%0D%0A__%20%3D%3E%20%7B%0D%0A%09__%0D%0A%7D%0D%0A%0D%0A__%20__%2C%20%3D%3E%20%7B%0D%0A%09__%20180%0D%0A%09__%2030%0D%0A%7D%0D%0A\", \"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A-55%2C%22size%22%3A0.3%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\", \"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\", \"Convertible.spx\": \"data:;,\", \"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A-204%2C%22y%22%3A-126%2C%22size%22%3A0.04%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}",
                            "endSnapshot": "{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22City%22%2C%22path%22%3A%22City.png%22%2C%22builder_id%22%3A%224Z7HpVxGWDUaa9xpAhp4m%22%7D%5D%2C%22backdropIndex%22%3A1%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\", \"main.spx\": \"data:;,\", \"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\", \"assets/City.png\": \"kodo://goplus-builder-usercontent-test/files/Fpa4N41zCy22Iz3-IgOJAsIfEo84-139687\", \"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\", \"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\", \"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\", \"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\", \"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\", \"WizardBlue.spx\": \"data:;,onStart%20%3D%3E%20%7B%0D%0A%09think%20%22%E5%A6%82%E4%BD%95%E9%80%9A%E8%BF%87%E6%96%91%E9%A9%AC%E7%BA%BF%E5%91%A2%EF%BC%9F%22%2C%204%0D%0A%09broadcast%20%22start%22%0D%0A%7D%0D%0A%0D%0AonTouchStart%20%3D%3E%20%7B%0D%0A%09die%0D%0A%7D%0D%0A%0D%0AonKey%20KeyDown%2C%20%3D%3E%20%7B%0D%0A%09setHeading%20180%0D%0A%09step%2030%0D%0A%7D%0D%0A\", \"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A-55%2C%22size%22%3A0.3%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\", \"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\", \"Convertible.spx\": \"data:;,\", \"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A-204%2C%22y%22%3A-126%2C%22size%22%3A0.04%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}",
                            "coding": {
                                "path": "WizardBlue.spx",
                                "codeMasks": [
                                    {
                                        "startPos": {
                                            "line": 2,
                                            "column": 5
                                        },
                                        "endPos": {
                                            "line": 2,
                                            "column": 9
                                        }
                                    },
                                    {
                                        "startPos": {
                                            "line": 2,
                                            "column": 23
                                        },
                                        "endPos": {
                                            "line": 2,
                                            "column": 24
                                        }
                                    },
                                    {
                                        "startPos": {
                                            "line": 3,
                                            "column": 5
                                        },
                                        "endPos": {
                                            "line": 3,
                                            "column": 13
                                        }
                                    },
                                    {
                                        "startPos": {
                                            "line": 6,
                                            "column": 1
                                        },
                                        "endPos": {
                                            "line": 6,
                                            "column": 12
                                        }
                                    },
                                    {
                                        "startPos": {
                                            "line": 7,
                                            "column": 5
                                        },
                                        "endPos": {
                                            "line": 7,
                                            "column": 7
                                        }
                                    },
                                    {
                                        "startPos": {
                                            "line": 10,
                                            "column": 1
                                        },
                                        "endPos": {
                                            "line": 10,
                                            "column": 5
                                        }
                                    },
                                    {
                                        "startPos": {
                                            "line": 10,
                                            "column": 7
                                        },
                                        "endPos": {
                                            "line": 10,
                                            "column": 13
                                        }
                                    },
                                    {
                                        "startPos": {
                                            "line": 11,
                                            "column": 5
                                        },
                                        "endPos": {
                                            "line": 11,
                                            "column": 14
                                        }
                                    },
                                    {
                                        "startPos": {
                                            "line": 12,
                                            "column": 5
                                        },
                                        "endPos": {
                                            "line": 12,
                                            "column": 8
                                        }
                                    }
                                ],
                                "startPosition": {
                                    "line": 1,
                                    "column": 1
                                },
                                "endPosition": {
                                    "line": 13,
                                    "column": 2
                                }
                            }
                        },
                        {
                            "title": {
                                "zh": "编写代码",
                                "en": "Write relevant code."
                            },
                            "description": {
                                "zh": "编写与车相关的代码",
                                "en": "Write car-related code."
                            },
                            "tip": {
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "coding",
                            "isCheck": true,
                            "isApiControl":true,
                            "apis": [
                                "gop:github.com/goplus/spx?Game.onMsg#1",
                                "gop:github.com/goplus/spx?Sprite.glide#0",
                                "gop:github.com/goplus/spx?Sprite.ypos"
                            ],
                            "isAssetControl": false,
                            "isSpriteControl":  true,
                            "sprites": [
                                "Convertible"
                            ],
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "assets": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22City%22%2C%22path%22%3A%22City.png%22%2C%22builder_id%22%3A%224Z7HpVxGWDUaa9xpAhp4m%22%7D%5D%2C%22backdropIndex%22%3A1%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\", \"main.spx\": \"data:;,\", \"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\", \"assets/City.png\": \"kodo://goplus-builder-usercontent-test/files/Fpa4N41zCy22Iz3-IgOJAsIfEo84-139687\", \"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\", \"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\", \"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\", \"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\", \"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\", \"WizardBlue.spx\": \"data:;,onStart%20%3D%3E%20%7B%0D%0A%09think%20%22%E5%A6%82%E4%BD%95%E9%80%9A%E8%BF%87%E6%96%91%E9%A9%AC%E7%BA%BF%E5%91%A2%EF%BC%9F%22%2C%204%0D%0A%09broadcast%20%22start%22%0D%0A%7D%0D%0A%0D%0AonTouchStart%20%3D%3E%20%7B%0D%0A%09die%0D%0A%7D%0D%0A%0D%0AonKey%20KeyDown%2C%20%3D%3E%20%7B%0D%0A%09setHeading%20180%0D%0A%09step%2030%0D%0A%7D%0D%0A\", \"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A-55%2C%22size%22%3A0.3%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\", \"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\", \"Convertible.spx\": \"data:;,__%20%22start%22%2C%20%3D%3E%20%7B%0D%0A%09__%20%7B%0D%0A%09%09__%20200%2C%20ypos%2C%202%0D%0A%09%09glide%20-200%2C%20ypos%2C%202%0D%0A%09%7D%0D%0A%7D%0D%0A\", \"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A-204%2C%22y%22%3A-126%2C%22size%22%3A0.04%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}",
                                "endSnapshot": "{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22City%22%2C%22path%22%3A%22City.png%22%2C%22builder_id%22%3A%224Z7HpVxGWDUaa9xpAhp4m%22%7D%5D%2C%22backdropIndex%22%3A1%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\", \"main.spx\": \"data:;,\", \"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\", \"assets/City.png\": \"kodo://goplus-builder-usercontent-test/files/Fpa4N41zCy22Iz3-IgOJAsIfEo84-139687\", \"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\", \"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\", \"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\", \"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\", \"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\", \"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\", \"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\", \"WizardBlue.spx\": \"data:;,onStart%20%3D%3E%20%7B%0D%0A%09think%20%22%E5%A6%82%E4%BD%95%E9%80%9A%E8%BF%87%E6%96%91%E9%A9%AC%E7%BA%BF%E5%91%A2%EF%BC%9F%22%2C%204%0D%0A%09broadcast%20%22start%22%0D%0A%7D%0D%0A%0D%0AonTouchStart%20%3D%3E%20%7B%0D%0A%09die%0D%0A%7D%0D%0A%0D%0AonKey%20KeyDown%2C%20%3D%3E%20%7B%0D%0A%09setHeading%20180%0D%0A%09step%2030%0D%0A%7D%0D%0A\", \"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A-55%2C%22size%22%3A0.3%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\", \"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\", \"Convertible.spx\": \"data:;,onMsg%20%22start%22%2C%20%3D%3E%20%7B%0D%0A%09for%20%7B%0D%0A%09%09glide%20200%2C%20ypos%2C%202%0D%0A%09%09glide%20-200%2C%20ypos%2C%202%0D%0A%09%7D%0D%0A%7D%0D%0A\", \"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A-204%2C%22y%22%3A-126%2C%22size%22%3A0.04%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}"
                            },
                            "coding": {
                                "path": "Convertible.spx",
                                "codeMasks": [
                                    {
                                        "startPos": {
                                            "line": 1,
                                            "column": 1
                                        },
                                        "endPos": {
                                            "line": 1,
                                            "column": 5
                                        }
                                    },
                                    {
                                        "startPos": {
                                            "line": 2,
                                            "column": 5
                                        },
                                        "endPos": {
                                            "line": 2,
                                            "column": 7
                                        }
                                    },
                                    {
                                        "startPos": {
                                            "line": 3,
                                            "column": 9
                                        },
                                        "endPos": {
                                            "line": 3,
                                            "column": 13
                                        }
                                    }
                                ],
                                "startPosition":{
                                    "line": 1,
                                    "column": 1
                                },
                                "endPosition":{
                                    "line": 6,
                                    "column": 12
                                }  
                            }
                        }
                    ]
                }
            ]
        },
        {
            "cover": "http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/green.png",
            "placement": {
                "x": 130,
                "y": 35
            },
            "title": {
                "zh": "创建精灵和背景.",
                "en": "Create a sprite and a background."
            },
            "description": {
                "zh": "创建精灵和背景，让你的项目栩栩如生。精灵可以是一个角色或物体，背景则为场景设定基调。你可以通过颜色、图片或动画对它们进行自定义，让你的作品独一无二。",
                "en": "Create sprites and backgrounds to bring your project to life. The Sprite can be a character or object, and the background sets the tone for the scene. You can customize them with colors, pictures, or animations to make your creations unique."
            },
            "video": "http://ssbvnda4w.hn-bkt.clouddn.com/qny/video/spirit%26backdrop.mkv",
            "achievement": {
                "icon": "http://ssbvnda4w.hn-bkt.clouddn.com/qny/img/primacy.png",
                "title": {
                    "zh": "初级",
                    "en": "primary"
                }
            },
            "nodeTasks": [
                {
                    "name": {
                        "zh": "创建精灵",
                        "en": "Create Sprite"
                    },
                    "triggerTime": 41,
                    "video": "",
                    "steps": [
                        {
                            "title": {
                                "zh": "点击素材库",
                                "en": "click asset library"
                            },
                            "description": {
                                "zh": "素材库里会存在由系统提供的丰富素材，点击素材库，选择你所喜欢的素材！",
                                "en": "The asset library contains a rich collection of resources provided by the system. Click on the asset library and choose your favorite ones!"
                            },
                            "tip": {
                                "zh": "请点击此处，打开素材库",
                                "en": "Please click here to open the asset library."
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl":false,
                            "isAssetControl": false,
                            "isSpriteControl":  false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\"}",
                                "endSnapshot": ""
                            }
                        },
                        {
                            "title": {
                                "zh": "选择精灵1",
                                "en": "Select Sprite 1"
                            },
                            "description": {
                                "zh": "在素材库中通过点击鼠标左键选择精灵！",
                                "en": "Select the sprite by clicking the left mouse button in the asset library!"
                            },
                            "tip": {
                                "zh": "请用鼠标左键点击此处，选择精灵1",
                                "en": "Please click here with the left mouse button to select Sprite 1."
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl": false,
                            "isAssetControl": true,
                            "isSpriteControl": false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [
                                "11122",
                                "10885"
                            ],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\"}",
                                "endSnapshot": ""
                            }
                        },
                        {
                            "title": {
                                "zh": "选择精灵2",
                                "en": "Select Sprite 2"
                            },
                            "description": {
                                "zh": "素材库中可以一次性勾选多个精灵。勾选你的第二个精灵。",
                                "en": "In the material library, you can select multiple sprites at once. Check your second sprite."
                            },
                            "tip": {
                                "zh": "素材库中可以一次性勾选多个精灵！点击此处，选择你的第二个精灵吧！",
                                "en": "You can select multiple sprites at once in the asset library! Click here to choose your second sprite!"
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl": false,
                            "isAssetControl": true,
                            "isSpriteControl": false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [
                                "11122",
                                "10885"
                            ],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\"}",
                                "endSnapshot": ""
                            }
                        },
                        {
                            "title": {
                                "zh": "点击确定按钮",
                                "en": "Click OK button"
                            },
                            "description": {
                                "zh": "点击确定按钮",
                                "en": "Click OK button"
                            },
                            "tip": {
                                "zh": "请点击此处确定按钮",
                                "en": "Click OK button"
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": true,
                            "isApiControl":false,
                            "isAssetControl": true,
                            "isSpriteControl":  false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [
                                "11122",
                                "10885"
                            ],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%5D%2C%22builder_spriteOrder%22%3A%5B%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\"}",
                                "endSnapshot": "{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\",\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\",\"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\",\"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\",\"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\",\"WizardBlue.spx\": \"data:;,\",\"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.7003891050583657%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\",\"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\",\"Convertible.spx\": \"data:;,\",\"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.15748031496062992%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}"
                            }
                        }
                    ]
                },
                {
                    "name": {
                        "zh": "创建背景",
                        "en": "Create backdrop"
                    },
                    "triggerTime": 60,
                    "video": "",
                    "steps": [
                        {
                            "title": {
                                "zh": "点击舞台",
                                "en": "Click the stage."
                            },
                            "description": {
                                "zh": "点击舞台",
                                "en": "Click the stage."
                            },
                            "tip": {
                                "zh": "请点击此处，切换到舞台",
                                "en": "Please click here to switch to the stage."
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl":false,
                            "isAssetControl": false,
                            "isSpriteControl":  false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\",\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\",\"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\",\"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\",\"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\",\"WizardBlue.spx\": \"data:;,\",\"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.7003891050583657%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\",\"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\",\"Convertible.spx\": \"data:;,\",\"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.15748031496062992%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}",
                                "endSnapshot": ""
                            }
                        },
                        {
                            "title": {
                                "zh": "点击背景",
                                "en": "Click the backdrop"
                            },
                            "description": {
                                "zh": "点击背景",
                                "en": "Click the backdrop"
                            },
                            "tip": {
                                "zh": "请点击此处，切换到背景",
                                "en": "Please click here to switch to the backdrop."
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl":false,
                            "isAssetControl": false,
                            "isSpriteControl":  false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\",\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\",\"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\",\"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\",\"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\",\"WizardBlue.spx\": \"data:;,\",\"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.7003891050583657%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\",\"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\",\"Convertible.spx\": \"data:;,\",\"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.15748031496062992%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}",
                                "endSnapshot": ""
                            }
                        },
                        {
                            "title": {
                                "zh": "点击\"+\"号",
                                "en": "Click the \"+\" button."
                            },
                            "description": {
                                "zh": "点击\"+\"号",
                                "en": "Click the \"+\" button."
                            },
                            "tip": {
                                "zh": "请点击此处，添加背景",
                                "en": "Please click here to add a backdrop."
                            },
                            "duration": 20,
                            "target": [ // TODO
                                "",
                                ""
                            ],
                            "type": "following",
                            "isCheck": false,
                            "isApiControl":false,
                            "isAssetControl": false,
                            "isSpriteControl":  false,
                            "isSoundControl": false,
                            "isCostumeControl": false,
                            "isAnimationControl": false,
                            "isWidgetControl": false,
                            "isBackdropControl": false,
                            "apis": [],
                            "assets": [],
                            "sprites": [],
                            "sounds": [],
                            "costumes": [], 
                            "animations": [],
                            "widgets": [],
                            "backdrops": [],
                            "snapshot": {
                                "startSnapshot": "{\"assets/index.json\": \"data:application/json,%7B%22backdrops%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A2%2C%22name%22%3A%22backdrop%22%2C%22path%22%3A%22backdrop.png%22%2C%22builder_id%22%3A%226Uq-FYRBI2kJdVDX4-NCK%22%7D%5D%2C%22backdropIndex%22%3A0%2C%22map%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%2C%22mode%22%3A%22fillRatio%22%7D%2C%22run%22%3A%7B%22width%22%3A480%2C%22height%22%3A360%7D%2C%22zorder%22%3A%5B%22WizardBlue%22%2C%22Convertible%22%5D%2C%22builder_spriteOrder%22%3A%5B%22rn9EAX3mOk4X1X9dnEIXH%22%2C%22D5rATNr5jEAoZSEdl6hBB%22%5D%2C%22builder_soundOrder%22%3A%5B%5D%7D\",\"main.spx\": \"data:;,\",\"assets/backdrop.png\": \"kodo://goplus-builder-usercontent-test/files/Fv-ccS4pGzRPTHPIT_MdFhLO5BTa-1264\",\"assets/sprites/WizardBlue/cover.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_death__animation_death_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FqbY-P29nrkEnEmxBMQtuzJ18lIL-27562\",\"assets/sprites/WizardBlue/__animation_death__animation_death_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FvUxBspqVzdhwIbt5GXKXzop6KGn-18028\",\"assets/sprites/WizardBlue/__animation_death__animation_death_2.svg\": \"kodo://goplus-builder-usercontent-test/files/Foa0nYW0WO_wGDTiIC93CfW-JbSH-27838\",\"assets/sprites/WizardBlue/__animation_death__animation_death_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fq89LBxvJRzU5_3h_df8eW85YehH-28305\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgwD27ISH19sGTIJAtMyEOjfWu0_-40856\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FjddTzCJuB47ffkB8u-qcLrQBzDA-45981\",\"assets/sprites/WizardBlue/__animation_idle__animation_idle_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FkEqxFGBH2Hu8u03DQ4DJeDViaIr-40676\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_0.svg\": \"kodo://goplus-builder-usercontent-test/files/FgovnZ5jB6FwrC8jq7Qdq6Fq_6Ev-38130\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_1.svg\": \"kodo://goplus-builder-usercontent-test/files/FguTzhsHivs9TS6SRyUjC9_SsbSj-28441\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_2.svg\": \"kodo://goplus-builder-usercontent-test/files/FmQf1z5vOvQLbpHcFk-aVxkg5qW0-32682\",\"assets/sprites/WizardBlue/__animation_walk__animation_walk_3.svg\": \"kodo://goplus-builder-usercontent-test/files/Fh6_xXSiDplHqDBnE2C8dD6qTSV7-26305\",\"WizardBlue.spx\": \"data:;,\",\"assets/sprites/WizardBlue/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.7003891050583657%2C%22rotationStyle%22%3A%22left-right%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A128.5%2C%22y%22%3A-128.5%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22cover%22%2C%22path%22%3A%22cover.svg%22%2C%22builder_id%22%3A%22lln6-Qw7tDv-dhvtSy7SZ%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_0%22%2C%22path%22%3A%22__animation_death__animation_death_0.svg%22%2C%22builder_id%22%3A%22n7Wayq78-zUtQdLqZS1wn%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_1%22%2C%22path%22%3A%22__animation_death__animation_death_1.svg%22%2C%22builder_id%22%3A%22fsfHpeso_h4DkpxnJmiqw%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_2%22%2C%22path%22%3A%22__animation_death__animation_death_2.svg%22%2C%22builder_id%22%3A%223cBsfUwrTCX5MXQz-e11W%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_death__animation_death_3%22%2C%22path%22%3A%22__animation_death__animation_death_3.svg%22%2C%22builder_id%22%3A%22WVOFxC0BBVaDrnE6Nm3nc%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_0%22%2C%22path%22%3A%22__animation_idle__animation_idle_0.svg%22%2C%22builder_id%22%3A%22xOQcC2vd8blw2t5IUkcPk%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_1%22%2C%22path%22%3A%22__animation_idle__animation_idle_1.svg%22%2C%22builder_id%22%3A%22IhcASPM6VYZvKCDXaAHH7%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_idle__animation_idle_2%22%2C%22path%22%3A%22__animation_idle__animation_idle_2.svg%22%2C%22builder_id%22%3A%22QqvXz-lGX1N3VT1LC-OcC%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_0%22%2C%22path%22%3A%22__animation_walk__animation_walk_0.svg%22%2C%22builder_id%22%3A%22w6cF6QHTENb-tTqbl8fho%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_1%22%2C%22path%22%3A%22__animation_walk__animation_walk_1.svg%22%2C%22builder_id%22%3A%22JBUxqGee88phleLkfRrtq%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_2%22%2C%22path%22%3A%22__animation_walk__animation_walk_2.svg%22%2C%22builder_id%22%3A%22ybqV1KhC3EuBEanMwUZ1M%22%7D%2C%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22__animation_walk__animation_walk_3%22%2C%22path%22%3A%22__animation_walk__animation_walk_3.svg%22%2C%22builder_id%22%3A%22IkQmj54ipgrurN7DPRvTg%22%7D%5D%2C%22fAnimations%22%3A%7B%22death%22%3A%7B%22frameFrom%22%3A%22__animation_death__animation_death_0%22%2C%22frameTo%22%3A%22__animation_death__animation_death_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22iT7sgP35D9l_L0XwEDjWu%22%7D%2C%22idle%22%3A%7B%22frameFrom%22%3A%22__animation_idle__animation_idle_0%22%2C%22frameTo%22%3A%22__animation_idle__animation_idle_2%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22PXB4BJXKhbLdITSwj5u0x%22%7D%2C%22walk%22%3A%7B%22frameFrom%22%3A%22__animation_walk__animation_walk_0%22%2C%22frameTo%22%3A%22__animation_walk__animation_walk_3%22%2C%22frameFps%22%3A1%2C%22builder_id%22%3A%22cwU6fvlDiVi0b9U3dg1Ku%22%7D%7D%2C%22defaultAnimation%22%3A%22idle%22%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22rn9EAX3mOk4X1X9dnEIXH%22%7D\",\"assets/sprites/Convertible/convertible.svg\": \"kodo://goplus-builder-usercontent-test/files/Fr779SraGGUA9Y9dkZ0ndwC7Wizp-13038\",\"Convertible.spx\": \"data:;,\",\"assets/sprites/Convertible/index.json\": \"data:application/json,%7B%22heading%22%3A90%2C%22x%22%3A0%2C%22y%22%3A0%2C%22size%22%3A0.15748031496062992%2C%22rotationStyle%22%3A%22normal%22%2C%22costumeIndex%22%3A0%2C%22visible%22%3Atrue%2C%22isDraggable%22%3Afalse%2C%22pivot%22%3A%7B%22x%22%3A762%2C%22y%22%3A-512%7D%2C%22costumes%22%3A%5B%7B%22x%22%3A0%2C%22y%22%3A0%2C%22faceRight%22%3A0%2C%22bitmapResolution%22%3A1%2C%22name%22%3A%22convertible%22%2C%22path%22%3A%22convertible.svg%22%2C%22builder_id%22%3A%22dGZxRq1rFkDdI61uxB5VQ%22%7D%5D%2C%22fAnimations%22%3A%7B%7D%2C%22animBindings%22%3A%7B%7D%2C%22builder_id%22%3A%22D5rATNr5jEAoZSEdl6hBB%22%7D\"}",
                                "endSnapshot": ""
                            }
                        }
                    ]
                }
            ]
        },
    ]
}


const storyLineStudyJson = 
{
    "storyLineId": "1",
    "lastFinishedLevelIndex": 1,
}


export async function getStoryLine(storyLineId: string): Promise<StoryLine> {
    // const storyLine: StoryLine = JSON.parse(storyLineJson)
    const storyLine: StoryLine = storyLineJson as unknown as StoryLine
    return storyLine
}

export async function getStoryLineStudy(storyLineId: string): Promise<StoryLineStudy> {
    // const storyLineStudy: StoryLineStudy = JSON.parse(storyLineStudyJson)
    const storyLineStudy: StoryLineStudy = storyLineStudyJson as unknown as StoryLineStudy
    return storyLineStudy
}

export async function listStoryLine(tag: 'easy' | 'medium' | 'hard'): Promise<StoryLine[]> {
    // const storyLine: StoryLine = JSON.parse(storyLineJson)
    const storyLine: StoryLine = storyLineJson as unknown as StoryLine
    const storyLines: StoryLine[] = [storyLine, storyLine, storyLine, storyLine, storyLine, storyLine, storyLine, storyLine, storyLine, storyLine];
    return storyLines
}

export type CheckCodeInput = {
    userCode: string,
    expectedCode: string,
    context: string
}

export async function checkCode(input: CheckCodeInput): Promise<boolean> {
    return true
}

export async function createStoryLineStudy(storyLineId: string): Promise<StoryLineStudy> {
    // const storyLineStudy: StoryLineStudy = JSON.parse(storyLineStudyJson)
    const storyLineStudy: StoryLineStudy = storyLineStudyJson as unknown as StoryLineStudy
    return storyLineStudy
}

export async function updateStoryLineStudy(storyLineStudy: StoryLineStudy): Promise<StoryLineStudy> {
    storyLineStudy.lastFinishedLevelIndex += 1
    return storyLineStudy
}
