<template>
  <div class="brush-thickness-container">
    <label for="brush-thickness-slider" class="brush-thickness-label">
      {{ $t({ en: 'Brush Thickness', zh: '笔刷粗细' }) }}
    </label>
    <input
      id="brush-thickness-slider"
      v-model="thickness"
      type="range"
      min="1"
      max="10"
      class="brush-thickness-slider"
    />
    <span class="brush-thickness-value">{{ thickness }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

// 受控属性
const props = defineProps<{
  modelValue: number
}>()

// v-model 事件
const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

// 本地副本用于驱动 range
const thickness = ref<number>(props.modelValue ?? 5)

// 父组件更新时同步 slider
watch(
  () => props.modelValue,
  (newVal) => {
    if (typeof newVal === 'number' && newVal !== thickness.value) {
      thickness.value = newVal
    }
  }
)

// slider 调整时通知父组件
watch(thickness, (newVal) => {
  emit('update:modelValue', newVal)
})
</script>

<style scoped lang="scss">
.brush-thickness-container {
  padding: 8px 6px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  color: #666;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  text-align: center;
}
</style>
