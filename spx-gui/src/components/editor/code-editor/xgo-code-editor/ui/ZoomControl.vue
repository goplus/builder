<script setup lang="ts">
import { UIButton } from '@/components/ui'

const emit = defineEmits<{
  in: []
  out: []
  reset: []
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <UIButton
      v-radar="{ name: 'Zoom in', desc: 'Zoom in the code editor' }"
      type="white"
      icon="zoomIn"
      shape="square"
      size="large"
      title="Zoom in"
      @click="emit('in')"
    />
    <UIButton
      v-radar="{ name: 'Zoom out', desc: 'Zoom out the code editor' }"
      type="white"
      icon="zoomOut"
      shape="square"
      size="large"
      title="Zoom out"
      @click="emit('out')"
    />
    <UIButton
      v-radar="{ name: 'Reset zoom', desc: 'Reset code editor zoom to default' }"
      type="white"
      icon="zoomReset"
      shape="square"
      size="large"
      title="Reset"
      @click="emit('reset')"
    />
  </div>
</template>
