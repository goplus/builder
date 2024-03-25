/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-22 14:55:22
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-23 18:47:30
 * @FilePath: \spx-gui\src\components\stage-viewer\index.ts
 * @Description:
 */
import StageViewer from './StageViewer.vue'
import type { Project } from '@/models/project'
export default StageViewer

// Props of StageViewer
export interface StageViewerProps {
  // Instance of spx project
  project: Project
  // Container height of stage viewer
  height?: number
  // Container width of stage viewer
  width?: number
  // Sprites's name that selected on the stage
  selectedSpriteNames: string[]
}

//  The selected sprites name change event
export interface SelectedSpritesChangeEvent {
  // sprites name
  names: string[]
}

// Emits of StageViewer
export interface StageViewerEmits {
  // selected sprites name change event
  (e: 'onSelectedSpritesChange', value: SelectedSpritesChangeEvent): void
}
