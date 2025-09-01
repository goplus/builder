<template>
  <div class="fill-tool">
    <!-- 填充工具不需要可视化界面元素，只处理点击事件 -->
  </div>
</template>

<script setup lang="ts">
import { watch, inject } from 'vue'
import paper from 'paper'

// Props
interface Props {
  canvasWidth: number
  canvasHeight: number
  isActive: boolean
}

const props = defineProps<Props>()

// 注入父组件接口
// const getAllPathsValue = inject<() => paper.Path[]>('getAllPathsValue')!
// const setAllPathsValue = inject<(paths: paper.Path[]) => void>('setAllPathsValue')!
const exportSvgAndEmit = inject<() => void>('exportSvgAndEmit')!

// 默认填充颜色
const fillColor = '#00ff00' // 绿色

// 区域填充实现 - 使用paper.js的hit test
const smartFill = (point: paper.Point): void => {
  if (!props.isActive) return

  // console.log('smartFill called with point:', point)

  // 检查点击位置是否在任何路径上（包括边框）
  const hitResult = paper.project.hitTest(point, {
    fill: true,
    stroke: true,
    tolerance: 5
  })

  // console.log('hitResult:', hitResult)

  if (hitResult && hitResult.item && hitResult.item instanceof paper.Path) {
    const targetPath = hitResult.item as paper.Path

    // console.log('Found path:', targetPath)
    // console.log('Current fillColor:', targetPath.fillColor)

    // 设置填充颜色（无论之前是否有填充色）
    targetPath.fillColor = new paper.Color(fillColor)

    // console.log('Set new fillColor:', targetPath.fillColor)

    // 更新视图
    paper.view.update()

    // 触发导出
    exportSvgAndEmit()
  } else {
    // console.log('No path hit, no action taken')
    // 如果没有击中路径，不执行任何操作
  }
}

// 处理画布点击事件
const handleCanvasClick = (point: paper.Point): void => {
  if (!props.isActive) return

  // console.log('Fill tool clicked at:', point)
  smartFill(point)
}

// 监听工具切换，确保只在激活时响应
watch(
  () => props.isActive,
  (newValue) => {
    if (newValue) {
      // console.log('Fill tool activated')
    }
  }
)

// 暴露方法给父组件
defineExpose({
  handleCanvasClick
})
</script>

<style scoped>
.fill-tool {
  /* 填充工具不需要特殊样式 */
}
</style>
