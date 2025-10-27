import paper from 'paper'
import type { Ref } from 'vue'
import { clearCanvas } from './clear-canvas'

// 导入导出相关的接口定义
export interface ImportExportDependencies {
  // 画布相关
  canvasWidth: Ref<number>
  canvasHeight: Ref<number>
  canvasRef: Ref<HTMLCanvasElement | null>

  // 路径管理
  allPaths: Ref<paper.Path[]>

  // 工具和状态
  currentTool: Ref<string | null>
  reshapeRef: Ref<any>
  backgroundRect: Ref<paper.Path | null>
  backgroundImage: Ref<paper.Raster | null>

  // 状态标记
  isImportingFromProps: Ref<boolean>

  // 回调函数
  emit: (event: string, data: any) => void
}

export interface ImportOptions {
  clearCanvas?: boolean
  position?: 'center' | 'original'
  updatePaths?: boolean
  triggerExport?: boolean
}

export interface ExportOptions {
  format?: 'svg' | 'png' | 'jpg'
  embedImages?: boolean
  bounds?: paper.Rectangle
  quality?: number
}

/**
 * 画布导入导出管理器
 * 统一管理SVG、图片的导入导出操作
 */
export class ImportExportManager {
  private dependencies: ImportExportDependencies

  constructor(dependencies: ImportExportDependencies) {
    this.dependencies = dependencies
  }

  /**
   * 导出当前画布为SVG
   */
  exportSvg(options: ExportOptions = {}): string | null {
    const { embedImages = true, bounds = paper.view.bounds } = options

    if (!paper.project) {
      console.warn('Paper project not initialized')
      return null
    }

    try {
      // 隐藏控制点和背景，避免导出到SVG中
      this.hideControlPointsForExport()
      const prevVisible = this.hideBackgroundForExport()

      const svgStr = paper.project.exportSVG({
        asString: true,
        embedImages,
        bounds
      }) as string

      // 恢复背景可见性
      this.restoreBackgroundAfterExport(prevVisible)

      return svgStr
    } catch (error) {
      console.error('Failed to export SVG:', error)
      return null
    }
  }

  /**
   * 导出SVG并触发事件
   */
  exportSvgAndEmit(options: ExportOptions = {}): void {
    const svgStr = this.exportSvg(options)
    if (svgStr) {
      this.dependencies.emit('svg-change', svgStr)
    }
  }

  /**
   * 导入SVG到画布
   */
  async importSvg(svgContent: string, options: ImportOptions = {}): Promise<boolean> {
    const { clearCanvas = false, position = 'center', updatePaths = true, triggerExport = true } = options

    if (!paper.project) {
      console.warn('Paper project not initialized')
      return false
    }

    try {
      if (clearCanvas) {
        this.clearCanvas(false) // 清空但不触发导出
      }

      // 解析SVG内容
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml')
      const svgElement = svgDoc.documentElement

      if (svgElement.nodeName !== 'svg') {
        console.error('Invalid SVG content')
        return false
      }

      // 导入SVG到Paper.js
      const importedItem = paper.project.importSVG(svgElement as unknown as SVGElement)

      if (!importedItem) {
        console.error('Failed to import SVG')
        return false
      }

      // 设置位置（不进行缩放，保持原始尺寸）
      this.positionItem(importedItem, position)

      // 收集可编辑路径
      if (updatePaths) {
        this.collectPathsFromImport(importedItem)
      }

      paper.view.update()

      // 触发导出（避免循环导入）
      if (triggerExport && !this.dependencies.isImportingFromProps.value) {
        this.exportSvgAndEmit()
      }

      return true
    } catch (error) {
      console.error('Failed to import SVG:', error)
      return false
    }
  }

  async importSvgFromPicgc(svgContent: string, options: ImportOptions = {}): Promise<boolean> {
    const { clearCanvas = false, updatePaths = true, triggerExport = true } = options

    if (!paper.project) {
      console.warn('Paper project not initialized')
      return false
    }

    try {
      if (clearCanvas) {
        this.clearCanvas(false) // 清空但不触发导出
      }

      // 解析SVG内容
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml')
      const svgElement = svgDoc.documentElement

      if (svgElement.nodeName !== 'svg') {
        console.error('Invalid SVG content')
        return false
      }

      const importedItem = paper.project.importSVG(svgElement as unknown as SVGElement)

      if (!importedItem) {
        console.error('Failed to import SVG')
        return false
      }

      // 设置位置（不进行缩放，保持 AI 生成的原始尺寸）
      this.positionItem(importedItem, 'center')

      // 收集可编辑路径
      if (updatePaths) {
        this.collectPathsFromImport(importedItem)
      }

      paper.view.update()

      // 触发导出（避免循环导入）
      if (triggerExport && !this.dependencies.isImportingFromProps.value) {
        this.exportSvgAndEmit()
      }

      return true
    } catch (error) {
      console.error('Failed to import SVG:', error)
      return false
    }
  }

  /**
   * 导入图片（PNG/JPG等）到画布
   */
  async importImage(imageSrc: string, options: ImportOptions = {}): Promise<boolean> {
    const { position = 'center', triggerExport = true } = options

    if (!paper.project) {
      console.warn('Paper project not initialized')
      return false
    }

    return new Promise((resolve) => {
      // 清除现有背景图片
      if (this.dependencies.backgroundImage.value) {
        try {
          this.dependencies.backgroundImage.value.remove()
        } catch (error) {
          console.warn('Error removing previous background image:', error)
        }
        this.dependencies.backgroundImage.value = null
      }

      // 创建新的光栅图像
      const raster = new paper.Raster(imageSrc)

      raster.onLoad = () => {
        try {
          // 设置位置（不进行缩放，保持原始尺寸）
          this.positionItem(raster, position)

          // 将图片放到最底层作为背景
          raster.sendToBack()

          // 更新背景图片引用
          this.dependencies.backgroundImage.value = raster

          paper.view.update()

          if (triggerExport) {
            this.exportSvgAndEmit()
          }

          resolve(true)
        } catch (error) {
          console.error('Error processing loaded image:', error)
          resolve(false)
        }
      }

      raster.onError = () => {
        console.error('Failed to load image:', imageSrc)
        resolve(false)
      }
    })
  }

  /**
   * 根据URL自动判断文件类型并导入
   */
  async importFile(fileUrl: string, options: ImportOptions = {}): Promise<boolean> {
    try {
      const response = await fetch(fileUrl)

      // 尝试判断是否为SVG
      let isSvg = false
      let content: string | null = null

      // 方法1: 通过blob类型判断
      try {
        const blob = await response.clone().blob()
        if (blob?.type?.includes('image/svg')) {
          isSvg = true
          content = await blob.text()
        }
      } catch {
        //暂时无需处理
      }

      // 方法2: 通过响应头判断
      if (!isSvg) {
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('image/svg')) {
          isSvg = true
          content = await response.clone().text()
        }
      }

      // 方法3: 尝试解析文本内容
      if (!isSvg) {
        try {
          const text = await response.clone().text()
          if (/^\s*<svg[\s\S]*<\/svg>\s*$/i.test(text)) {
            isSvg = true
            content = text
          }
        } catch {
          //暂时无需处理
        }
      }

      // 根据类型导入
      if (isSvg && content) {
        return await this.importSvg(content, options)
      } else {
        return await this.importImage(fileUrl, options)
      }
    } catch (error) {
      console.error('Failed to import file:', error)
      // 回退到图片导入
      return await this.importImage(fileUrl, options)
    }
  }

  /**
   * 清空画布
   */
  clearCanvas(triggerExport: boolean = true): void {
    clearCanvas(
      {
        canvasWidth: this.dependencies.canvasWidth,
        canvasHeight: this.dependencies.canvasHeight,
        allPaths: this.dependencies.allPaths,
        reshapeRef: this.dependencies.reshapeRef,
        backgroundRect: this.dependencies.backgroundRect,
        exportSvgAndEmit: () => this.exportSvgAndEmit()
      },
      triggerExport
    )
  }

  /**
   * 设置导入项目的位置（不进行缩放）
   */
  private positionItem(item: paper.Item, position: 'center' | 'original' = 'center'): void {
    if (!item) return

    // 只设置位置，不进行任何缩放
    if (position === 'center') {
      // 使用逻辑画布中心点，而不是视图中心
      item.position = new paper.Point(
        this.dependencies.canvasWidth.value / 2,
        this.dependencies.canvasHeight.value / 2
      )
    }
    // position === 'original' 时保持原始位置，什么都不做
  }

  /**
   * 从导入的项目中收集可编辑路径
   */
  private collectPathsFromImport(item: paper.Item): void {
    const allPaths = this.dependencies.allPaths.value

    const collectPaths = (item: paper.Item): void => {
      if (item instanceof paper.Path && item.segments && item.segments.length > 0) {
        allPaths.push(item)

        // 添加鼠标事件处理
        item.onMouseDown = () => {
          if (this.dependencies.currentTool.value === 'reshape' && this.dependencies.reshapeRef.value) {
            this.dependencies.reshapeRef.value.showControlPoints(item)
            paper.view.update()
          }
        }
      } else if (item instanceof paper.Group || item instanceof paper.CompoundPath) {
        if (item.children) {
          item.children.forEach((child) => collectPaths(child))
        }
      }
    }

    collectPaths(item)
  }

  /**
   * 导出前隐藏控制点
   */
  private hideControlPointsForExport(): void {
    if (this.dependencies.reshapeRef.value?.hideControlPoints) {
      this.dependencies.reshapeRef.value.hideControlPoints()
    }
  }

  /**
   * 导出前隐藏背景
   */
  private hideBackgroundForExport(): boolean {
    const prevVisible = this.dependencies.backgroundRect.value?.visible ?? true
    if (this.dependencies.backgroundRect.value) {
      this.dependencies.backgroundRect.value.visible = false
    }
    return prevVisible
  }

  /**
   * 导出后恢复背景
   */
  private restoreBackgroundAfterExport(prevVisible: boolean): void {
    if (this.dependencies.backgroundRect.value) {
      this.dependencies.backgroundRect.value.visible = prevVisible
    }
  }
}

// 创建单例实例
export const createImportExportManager = (dependencies: ImportExportDependencies): ImportExportManager => {
  return new ImportExportManager(dependencies)
}
