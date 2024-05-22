<template>
  <div class="volume-slider">
    <img :src="volumeDown" alt="Volume down" />
    <UISlider class="slider" type="sound" :value="50" :tooltip="false" />
    <img :src="volumeUp" alt="Volume up" />
  </div>
</template>
<script setup lang="ts">
import { UISlider } from '@/components/ui'
import volumeDown from './icons/volume-down.svg'
import volumeUp from './icons/volume-up.svg'
</script>
<style scoped lang="scss">
.volume-slider {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
