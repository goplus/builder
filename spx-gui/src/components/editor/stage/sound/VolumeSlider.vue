<template>
  <div class="volume-slider flex items-center gap-2">
    <UIIcon class="w-6 h-6 text-grey-800" type="volumeOff" />
    <UISlider
      :min="0"
      :max="2"
      :step="0.01"
      :value="value"
      :tooltip="false"
      @update:value="(v) => emit('update:value', v)"
    />
    <UIIcon class="w-6 h-6 text-grey-800" type="volumeUp" />
  </div>
</template>
<script setup lang="ts">
import { UIIcon, UISlider } from '@/components/ui'

defineProps<{
  value: number
}>()

const emit = defineEmits<{
  'update:value': [number]
}>()
</script>
