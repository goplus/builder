import type { Ref } from 'vue'
import paper from 'paper'

// 定义依赖接口
interface SvgExportDependencies {
  reshapeRef: Ref<any> | null
  backgroundRect: Ref<paper.Path | null>
  emit: (svg: string) => void
}

// 导出SVG功能的组合式函数
export const useSvgExporter = (dependencies: SvgExportDependencies) => {
  const { reshapeRef, backgroundRect, emit } = dependencies

  // 导出当前画布为 SVG 并上报父组件
  const exportSvgAndEmit = (): void => {
    // console.log('exportSvgAndEmit 被调用')
    if (!paper.project) {
      // paper.project does not exist
      return
    }
    
    // 在导出SVG之前隐藏所有控制点，避免控制点被包含在SVG中
    if (reshapeRef?.value) {
      reshapeRef.value.hideControlPoints()
    }
    
    const prevVisible = backgroundRect.value?.visible ?? true
    if (backgroundRect.value) backgroundRect.value.visible = false
    try {
      // 导出SVG时保持原始尺寸和viewBox
      const svgStr = (paper.project as any).exportSVG({ 
        asString: true, 
        embedImages: true,
        bounds: paper.view.bounds // 使用视图边界确保尺寸正确
      }) as string
      // console.log('exported svg length:', svgStr?.length)
      if (typeof svgStr === 'string') {
        // console.log('send svg-change event')
        emit(svgStr)
      }
    } catch (e) {
      console.error('failed to export svg:', e)
    } finally {
      if (backgroundRect.value) backgroundRect.value.visible = prevVisible
    }
  }

  return {
    exportSvgAndEmit
  }
}