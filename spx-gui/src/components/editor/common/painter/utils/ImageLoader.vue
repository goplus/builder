<template>
  <div style="display: none;">
    <!-- 隐藏的工具组件，只提供方法 -->
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import paper from 'paper'

// 从父组件注入的背景图片状态
const backgroundImage = inject<{ value: paper.Raster | null }>('backgroundImage')

// 加载位图图片到画布（PNG/JPG/...）
const loadImageToCanvas = (imageSrc: string): void => {
  if (!paper.project) return
  
  // 如果已有背景图片，先移除
  if (backgroundImage?.value) {
    backgroundImage.value.remove()
  }
  
  // 创建新的光栅图像
  const raster = new paper.Raster(imageSrc)
  
  raster.onLoad = () => {
    raster.position = paper.view.center
    
    // 将图片放到最底层，作为背景
    raster.sendToBack()
    
    if (backgroundImage) {
      backgroundImage.value = raster
    }
    paper.view.update()
  }
}

// 暴露方法给父组件
defineExpose({
  loadImageToCanvas
})
</script>