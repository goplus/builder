<template>
  <div class="color-selector">
    <button
      :class="['tool-btn', { active: isActive }]"
      :title="$t({ en: 'Select Color', zh: '选择颜色' })"
      type="button"
      @click="handleColorSelect"
    >
      <span class="color-icon" :style="{ backgroundColor: canvasColor }"></span>
      <span>{{ $t({ en: 'Color', zh: '颜色' }) }}</span>
    </button>

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
import { inject, ref, type Ref, watch } from 'vue'
import { NModal, NColorPicker, NButton } from 'naive-ui'

// 定义props
const props = defineProps<{
  isActive: boolean
}>()

// 注入当前画布颜色（用于展示已选择的颜色）
const canvasColor = inject<Ref<string>>('canvasColor', ref('#000'))

// 颜色选择器相关状态
const showColorPicker = ref(false)
const selectedColor = ref('')

// 颜色选择器处理函数
const handleColorConfirm = (): void => {
  canvasColor.value = selectedColor.value
  showColorPicker.value = false
}

const handleColorCancel = (): void => {
  showColorPicker.value = false
}

// 处理颜色选择按钮点击
const handleColorSelect = (): void => {
  selectedColor.value = canvasColor.value
  showColorPicker.value = true
}

// 初始化颜色选择器的方法
const initColorPicker = (): void => {
  selectedColor.value = canvasColor.value
  showColorPicker.value = true
}

// 监听工具切换，每次激活时显示颜色选择器
watch(
  () => props.isActive,
  (newValue) => {
    if (newValue) {
      initColorPicker()
    } else {
      showColorPicker.value = false
    }
  }
)

// 暴露方法给父组件
defineExpose({
  showColorPicker: initColorPicker
})
</script>

<style scoped>
.color-selector {
  position: relative;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 6px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  text-align: center;
  min-height: 48px;
}

.tool-btn:hover {
  background-color: #f8f9fa;
  border-color: #2196f3;
  color: #2196f3;
}

.tool-btn:focus {
  outline: none;
  box-shadow: none;
}

.tool-btn span {
  font-weight: 500;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}

.color-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
  display: inline-block;
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
