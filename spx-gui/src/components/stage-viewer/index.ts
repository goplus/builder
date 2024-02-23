/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-22 14:55:22
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-23 12:03:27
 * @FilePath: \spx-gui\src\components\stage-viewer\index.ts
 * @Description: 
 */
import StageViewer from "./StageViewer.vue"
import type { Project } from "@/class/project";
export default StageViewer

/**
 * @description: Prop of StageViewer
 * @return {*}
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-02 17:18:49
 */
export interface StageViewerProps {
    project: Project
    height?: number
    width?: number
    selectedSpriteNames: string[]
}

export interface SelectedSpriteChangeEvent {
    names: string[]
}
export interface StageViewerEmits {
    (e: 'onSelectedSpriteChange', value: SelectedSpriteChangeEvent): void
}




