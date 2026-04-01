<template>
  <div class="volume-slider flex items-center gap-2">
    <UIIcon type="volumeOff" class="text-grey-800" style="width: 24px; height: 24px" />
    <UISlider
      color="sound"
      :min="0"
      :max="2"
      :step="0.01"
      :value="value"
      :tooltip="false"
      @update:value="(v) => emit('update:value', v)"
    />
    <UIIcon type="volumeUp" class="text-grey-800" style="width: 24px; height: 24px" />
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
