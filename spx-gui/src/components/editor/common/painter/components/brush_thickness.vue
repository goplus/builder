<template>
  <div class="brush-thickness-container">
    <label for="brush-thickness-slider" class="brush-thickness-label">
        {{  $t({ en: 'Brush Thickness', zh: '笔刷粗细' })  }}
    </label>
    <input
      id="brush-thickness-slider"
      type="range"
      min="1"
      max="10"
      v-model="thickness"
      class="brush-thickness-slider"
    />
    <span class="brush-thickness-value">{{ thickness }}</span>
  </div>
</template>

<script setup lang="ts">

import { ref, watch, defineEmits } from 'vue'

// 定义事件
const emit = defineEmits<{
  (e: 'thicknessChange', value: number): void
}>()
// 响应式变量
const thickness = ref<number>(5)
// 监听thickness变化并发出事件
watch(thickness, (newVal) => {
  emit('thicknessChange', newVal)
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