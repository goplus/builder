<template>
  <NSlider
    class="ui-slider"
    :style="{
      '--n-fill-color': `var(--ui-color-${type}-500)`,
      '--n-fill-color-hover': `var(--ui-color-${type}-500)`,
      '--n-rail-color': 'rgb(245,245,245)'
    }"
  >
    <template #thumb>
      <div class="thumb" :style="{ boxShadow }"></div>
    </template>
  </NSlider>
</template>
<script setup lang="ts">
import { NSlider } from 'naive-ui'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    type: 'primary' | 'secondary' | 'boring' | 'danger' | 'success' | 'sound'
  }>(),
  {
    type: 'primary'
  }
)

const boxShadow = computed(() => {
  return `inset 0 0 0 1px var(--ui-color-${props.type}-500)`
})
</script>
<style lang="scss" scoped>
.thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #fff;
  transition: transform 0.2s;
  &:hover {
    transform: scale(1.2);
  }
}
</style>
