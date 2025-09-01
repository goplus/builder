<template>
  <div class="fill-tool">
    <!-- 颜色选择器弹窗 -->
    <n-modal v-model:show="showColorPicker" :mask-closable="false">
      <div class="color-picker-modal">
        <h3>选择填充颜色</h3>
        <n-color-picker v-model:value="selectedColor" :actions="['clear']" />
        <div class="modal-buttons">
          <n-button @click="handleColorCancel">取消</n-button>
          <n-button type="primary" @click="handleColorConfirm">确认</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { watch, inject, ref } from 'vue'
import { NModal, NColorPicker, NButton } from 'naive-ui'
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

// 颜色选择器相关状态
const showColorPicker = ref(false)
const selectedColor = ref('#ffffff00') // 默认绿色
const fillColor = ref('#ffffff00') // 当前填充颜色

// 颜色选择器处理函数
const handleColorConfirm = (): void => {
  fillColor.value = selectedColor.value
  showColorPicker.value = false
}

const handleColorCancel = (): void => {
  showColorPicker.value = false
  selectedColor.value = fillColor.value // 恢复之前的颜色
}

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
    targetPath.fillColor = new paper.Color(fillColor.value)

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

  // 直接执行填充，不再显示颜色选择器
  smartFill(point)
}

// 监听工具切换，每次激活时显示颜色选择器
watch(
  () => props.isActive,
  (newValue) => {
    if (newValue) {
      // 每次工具被激活时都显示颜色选择器
      selectedColor.value = fillColor.value
      showColorPicker.value = true
    } else {
      // 工具被取消激活时，关闭弹窗
      showColorPicker.value = false
    }
  }
)

// 显示颜色选择器的方法
const showColorPickerDialog = (): void => {
  selectedColor.value = fillColor.value
  showColorPicker.value = true
}

// 暴露方法给父组件
defineExpose({
  handleCanvasClick,
  showColorPicker: showColorPickerDialog
})
</script>

<style scoped>
.fill-tool {
  position: relative;
}

.color-picker-modal {
  background: white;
  padding: 24px;
  border-radius: 8px;
  max-width: 400px;
  min-width: 320px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.color-picker-modal h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
