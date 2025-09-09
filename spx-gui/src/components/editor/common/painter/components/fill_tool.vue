<template>
  <div class="fill-tool"></div>
</template>

<script setup lang="ts">
import { inject, ref, type Ref } from 'vue'
import paper from 'paper'

// Props
interface Props {
  canvasWidth: number
  canvasHeight: number
  isActive: boolean
}

const props = defineProps<Props>()

// 注入父组件接口
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!
const canvasColor = inject<Ref<string>>('canvasColor', ref('#000'))

// 区域填充实现 - 使用paper.js的hit test
const smartFill = (point: paper.Point): void => {
  if (!props.isActive) return

  // 检查点击位置是否在任何路径上（包括边框）
  const hitResult = paper.project.hitTest(point, {
    fill: true,
    stroke: true,
    tolerance: 5
  })

  if (hitResult && hitResult.item && hitResult.item instanceof paper.Path) {
    const targetPath = hitResult.item as paper.Path

    // 设置填充颜色（无论之前是否有填充色）
    targetPath.fillColor = new paper.Color(canvasColor.value)

    // 更新视图
    paper.view.update()

    // 触发导出
    exportSvgAndEmit()
  }
}

// 处理画布点击事件
const handleCanvasClick = (point: paper.Point): void => {
  if (!props.isActive) return

  // 直接执行填充
  smartFill(point)
}

// 暴露方法给父组件
defineExpose({
  handleCanvasClick
})
</script>

<style scoped>
.fill-tool {
  position: relative;
}
</style>
