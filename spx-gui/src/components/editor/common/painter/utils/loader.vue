<script lang="ts">
import { ref } from 'vue'
import paper from 'paper'

// 类型定义
export interface LoaderOptions {
  onPathCreated?: (path: paper.Path) => void
  onImageLoaded?: (raster: paper.Raster) => void
  onLoadComplete?: () => void
  onError?: (error: Error) => void
}

// 导出的工具函数
export const useImageLoader = () => {
  const isLoading = ref(false)
  
  /**
   * 加载位图图片到画布（PNG/JPG/...）
   * @param imageSrc 图片源URL
   * @param options 加载选项
   * @returns Promise<paper.Raster | null>
   */
  const loadImageToCanvas = (imageSrc: string, options: LoaderOptions = {}): Promise<paper.Raster | null> => {
    return new Promise((resolve, reject) => {
      if (!paper.project) {
        const error = new Error('Paper.js project not initialized')
        options.onError?.(error)
        reject(error)
        return
      }
      
      isLoading.value = true
      
      // 创建新的光栅图像
      const raster = new paper.Raster(imageSrc)
      
      raster.onLoad = () => {
        try {
          raster.position = paper.view.center
          
          // 将图片放到最底层，作为背景
          raster.sendToBack()
          
          paper.view.update()
          
          options.onImageLoaded?.(raster)
          options.onLoadComplete?.()
          
          isLoading.value = false
          resolve(raster)
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Failed to process loaded image')
          options.onError?.(err)
          isLoading.value = false
          reject(err)
        }
      }
      
      raster.onError = () => {
        const error = new Error('Failed to load image')
        options.onError?.(error)
        isLoading.value = false
        reject(error)
      }
    })
  }
  
  /**
   * 导入SVG到画布并转换为可编辑的路径
   * @param svgContent SVG内容字符串
   * @param options 加载选项
   * @returns Promise<paper.Item | null>
   */
  const importSvgToCanvas = (svgContent: string, options: LoaderOptions = {}): Promise<paper.Item | null> => {
    return new Promise((resolve, reject) => {
      if (!paper.project) {
        const error = new Error('Paper.js project not initialized')
        options.onError?.(error)
        reject(error)
        return
      }
      
      try {
        isLoading.value = true
        
        // 创建一个临时的SVG元素来解析SVG内容
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml')
        const svgElement = svgDoc.documentElement
        
        // 检查是否解析成功
        if (svgElement.nodeName !== 'svg') {
          throw new Error('Invalid SVG content')
        }
        
        // 使用Paper.js导入SVG
        const importedItem = paper.project.importSVG(svgElement as unknown as SVGElement)
        
        if (importedItem) {
          importedItem.position = paper.view.center
          
          // 收集所有可编辑的路径
          const paths: paper.Path[] = []
          
          const collectPaths = (item: paper.Item): void => {
            if (item instanceof paper.Path && item.segments && item.segments.length > 0) {
              paths.push(item)
              options.onPathCreated?.(item)
            } else if (item instanceof paper.Group || item instanceof paper.CompoundPath) {
              // 递归处理子项
              if (item.children) {
                item.children.forEach(child => collectPaths(child))
              }
            }
          }
          
          // 收集导入的所有路径
          collectPaths(importedItem)
          
          // 更新视图
          paper.view.update()
          
          options.onLoadComplete?.()
          isLoading.value = false
          resolve(importedItem)
        } else {
          throw new Error('Failed to import SVG')
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to import SVG')
        options.onError?.(err)
        isLoading.value = false
        reject(err)
      }
    })
  }
  
  /**
   * 根据URL自动判断并导入到画布（优先解析为SVG，其次作为位图Raster）
   * @param imageSrc 图片源URL
   * @param options 加载选项
   * @returns Promise<paper.Item | paper.Raster | null>
   */
  const loadFileToCanvas = async (imageSrc: string, options: LoaderOptions = {}): Promise<paper.Item | paper.Raster | null> => {
    if (!paper.project) {
      const error = new Error('Paper.js project not initialized')
      options.onError?.(error)
      throw error
    }
    
    try {
      isLoading.value = true
      
      const resp = await fetch(imageSrc)
      
      // 先尝试从响应体的blob.type判断（对blob: URL更可靠）
      let isSvg = false
      let svgText: string | null = null
      
      try {
        const blob = await resp.clone().blob()
        if (blob && typeof blob.type === 'string' && blob.type.includes('image/svg')) {
          isSvg = true
          svgText = await blob.text()
        }
      } catch {}
      
      // 退化到header判断
      if (!isSvg) {
        const contentType = resp.headers.get('content-type') || ''
        if (contentType.includes('image/svg')) {
          isSvg = true
          svgText = await resp.clone().text()
        }
      }
      
      // 最后尝试直接将文本解析为SVG（针对部分blob:无类型场景）
      if (!isSvg) {
        try {
          const text = await resp.clone().text()
          if (/^\s*<svg[\s\S]*<\/svg>\s*$/i.test(text)) {
            isSvg = true
            svgText = text
          }
        } catch {}
      }
      
      if (isSvg && svgText != null) {
        return await importSvgToCanvas(svgText, options)
      } else {
        return await loadImageToCanvas(imageSrc, options)
      }
    } catch (error) {
      // 回退策略：按位图处理
      try {
        return await loadImageToCanvas(imageSrc, options)
      } catch (fallbackError) {
        const err = fallbackError instanceof Error ? fallbackError : new Error('Failed to load file')
        options.onError?.(err)
        throw err
      }
    }
  }
  
  /**
   * 移除背景图片
   * @param backgroundImage 要移除的背景图片引用
   */
  const removeBackgroundImage = (backgroundImage: paper.Raster | null): void => {
    if (backgroundImage) {
      backgroundImage.remove()
    }
  }
  
  return {
    isLoading,
    loadImageToCanvas,
    importSvgToCanvas,
    loadFileToCanvas,
    removeBackgroundImage
  }
}

// Vue组件默认导出（虽然这个文件主要用作工具模块）
export default {
  name: 'ImageLoader'
}
</script>

<template>
  <!-- 这是一个工具模块，不需要渲染内容 -->
</template>
