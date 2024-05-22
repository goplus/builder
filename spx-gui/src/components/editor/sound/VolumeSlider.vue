<template>
  <div class="volume-slider">
    <UISlider class="slider" type="sound" />
  </div>
</template>
<script setup lang="ts">
import { UISlider } from '@/components/ui'
</script>
<style scoped lang="scss">
.volume-slider {
  display: flex;
  gap: 8px;
}
</style>
