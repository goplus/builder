import paper from 'paper'
import type { Ref } from 'vue'

// 清空画布所需的依赖接口
export interface ClearCanvasDependencies {
  // 画布相关
  canvasWidth: Ref<number>
  canvasHeight: Ref<number>

  // 路径管理
  allPaths: Ref<paper.Path[]>

  // 工具和状态
  reshapeRef: Ref<any>
  backgroundRect: Ref<paper.Path | null>

  // 回调函数
  exportSvgAndEmit?: () => void
}

/**
 * 创建画布背景
 */
function createBackground(canvasWidth: number, canvasHeight: number, backgroundRect: Ref<paper.Path | null>): void {
  const background = new paper.Path.Rectangle({
    point: [0, 0],
    size: [canvasWidth, canvasHeight],
    fillColor: 'transparent'
  })
  backgroundRect.value = background
}

/**
 * 重置工具状态
 */
function resetToolStates(reshapeRef: Ref<any>): void {
  // 通过reshape引用重置
  if (reshapeRef.value?.resetDrawing) {
    reshapeRef.value.resetDrawing()
  }
}

/**
 * 清空画布
 * @param dependencies 依赖项
 * @param triggerExport 是否触发导出事件，默认为 true
 */
export function clearCanvas(dependencies: ClearCanvasDependencies, triggerExport: boolean = true): void {
  if (!paper.project) return

  try {
    // 移除所有路径
    dependencies.allPaths.value.forEach((path: paper.Path) => {
      if (path && path.parent) {
        path.remove()
      }
    })
    dependencies.allPaths.value = []

    // 清空项目
    paper.project.clear()

    // 重新创建背景
    createBackground(dependencies.canvasWidth.value, dependencies.canvasHeight.value, dependencies.backgroundRect)

    // 重置工具状态
    resetToolStates(dependencies.reshapeRef)

    paper.view.update()

    if (triggerExport && dependencies.exportSvgAndEmit) {
      dependencies.exportSvgAndEmit()
    }
  } catch (error) {
    console.error('Failed to clear canvas:', error)
  }
}
