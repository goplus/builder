<template>
  <NSlider
    v-model:value="value"
    class="ui-slider"
    :style="{
      '--n-fill-color': 'var(--ui-color-primary-500)',
      '--n-fill-color-hover': 'var(--ui-color-primary-500)',
      '--n-rail-color': 'rgb(245,245,245)'
    }"
    :on-dragend="handleDragEnd"
    @update:value="handleUpdateValue"
  >
    <template #thumb>
      <!-- keep `ui-slider-thumb` for existing :deep(...) overrides -->
      <div
        class="ui-slider-thumb h-5 w-5 rounded-full bg-white transition-transform duration-200 hover:scale-120"
        :style="{ boxShadow }"
      ></div>
    </template>
  </NSlider>
</template>
<script setup lang="ts">
import { NSlider } from 'naive-ui'
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    value?: number
    updateOn?: 'dragend' | 'input'
  }>(),
  {
    value: 0,
    updateOn: 'dragend'
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
  return 'inset 0 0 0 1px var(--ui-color-primary-500)'
})

const handleDragEnd = async () => {
  if (props.updateOn !== 'dragend') return
  emit('update:value', value.value)
}

function handleUpdateValue(nextValue: number) {
  if (props.updateOn !== 'input') return
  emit('update:value', nextValue)
}
</script>
