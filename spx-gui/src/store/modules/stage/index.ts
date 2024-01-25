/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-25 16:03:30
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-25 17:47:08
 * @FilePath: /builder/spx-gui/src/store/modules/stage/index.ts
 * @Description: Stage store
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface StageConfig {
    width: number
    height: number
}

// TODO:use the interface of filemanager 
export interface CostumeConfig {
    path: string
    x: number
    y: number
}
export interface SpriteConfig {
    visible: boolean
    name: string
    size: number
    x: number
    y: number
    heading: number
    costumeIndex: number
    costumes: CostumeConfig[]
}

export const useStageStore = defineStore('stage', () => {
    /**
     * stage config
     */
    const stageConfig = ref<StageConfig>({
        width: 500,
        height: 300
    })

    return {
        stageConfig
    }
})
