<template>
  <button :class="['tool-btn', { active: isActive }]" :title="$t({ en: 'Select Color', zh: '选择颜色' })" type="button">
    <div class="color-icon" :style="{ backgroundColor: canvasColor }"></div>
    <span>{{ $t({ en: 'Color', zh: '颜色' }) }}</span>
  </button>
</template>

<script setup lang="ts">
import { inject, ref, type Ref } from 'vue'

// 定义props
defineProps<{
  isActive: boolean
}>()

// 注入当前画布颜色（用于展示已选择的颜色）
const canvasColor = inject<Ref<string>>('canvasColor', ref('#000'))
</script>

<style scoped>
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

.tool-btn.active {
  background-color: #e3f2fd;
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
</style>
