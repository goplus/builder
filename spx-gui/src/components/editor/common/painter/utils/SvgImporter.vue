<template>
  <div style="display: none;">
    <!-- 隐藏的工具组件，只提供方法 -->
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import paper from 'paper'

// 从父组件注入的接口
const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')
const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')

// 从父组件注入的其他必要方法和状态
const currentTool = inject<{ value: string }>('currentTool')
const reshapeRef = inject<{ value: any }>('reshapeRef')
const isImportingFromProps = inject<{ value: boolean }>('isImportingFromProps')
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')

// 导入SVG到画布并转换为可编辑的路径
const importSvgToCanvas = (svgContent: string): void => {
  if (!paper.project) return
  
  try {
    // 创建一个临时的SVG元素来解析SVG内容
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml')
    const svgElement = svgDoc.documentElement
    
    // 检查是否解析成功
    if (svgElement.nodeName !== 'svg') {
      console.error('invalid svg content')
      return
    }
    
    // 使用Paper.js导入SVG
    const importedItem = paper.project.importSVG(svgElement as unknown as SVGElement)
    
    if (importedItem) {
      importedItem.position = paper.view.center
      
      // 获取当前allPaths
      const allPaths = getAllPathsValue?.() || []
      
      // 收集所有可编辑的路径
      const collectPaths = (item: paper.Item): void => {
        if (item instanceof paper.Path && item.segments && item.segments.length > 0) {
          // 添加到可编辑路径列表
          allPaths.push(item)
          
          // 添加鼠标事件处理
          item.onMouseDown = () => {
            if (currentTool?.value === 'reshape' && reshapeRef?.value) {
              reshapeRef.value.showControlPoints(item)
              paper.view.update()
            }
          }
        } else if (item instanceof paper.Group || item instanceof paper.CompoundPath) {
          // 递归处理子项
          if (item.children) {
            item.children.forEach(child => collectPaths(child))
          }
        }
      }
      
      // 收集导入的所有路径
      collectPaths(importedItem)
      
      // 更新allPaths
      setAllPathsValue?.(allPaths)
      
      // 更新视图
      paper.view.update()
      
      // 导入来源于 props 时不导出，避免循环
      if (!isImportingFromProps?.value && exportSvgAndEmit) {
        exportSvgAndEmit()
      } else if (isImportingFromProps?.value) {
        isImportingFromProps.value = false
      }
    }
  } catch (error) {
    console.error('failed to import svg:', error)
  }
}

// 暴露方法给父组件
defineExpose({
  importSvgToCanvas
})
</script>