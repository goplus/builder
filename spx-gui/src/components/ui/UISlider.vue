<template>
  <NSlider
    v-model:value="value"
    class="ui-slider"
    :style="{
      '--n-fill-color': `var(--ui-color-${color}-500)`,
      '--n-fill-color-hover': `var(--ui-color-${color}-500)`,
      '--n-rail-color': 'rgb(245,245,245)'
    }"
    :on-dragend="handleDragEnd"
  >
    <template #thumb>
      <div class="thumb" :style="{ boxShadow }"></div>
    </template>
  </NSlider>
</template>
<script setup lang="ts">
import { NSlider } from 'naive-ui'
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    color?: 'primary' | 'sound'
    value?: number
  }>(),
  {
    color: 'primary',
    value: 0
  }
)

const emit = defineEmits<{
  'update:value': [number]
}>()

const value = ref(props.value)
watch(
  () => props.value,
  (v) => {
    value.value = v
  }
)

const boxShadow = computed(() => {
  return `inset 0 0 0 1px var(--ui-color-${props.color}-500)`
})

const handleDragEnd = async () => {
  emit('update:value', value.value)
}
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
