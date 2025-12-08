<script lang="ts">
export type ConfigType = 'default' | 'heading' | 'size' | 'pos'
</script>

<script lang="ts" setup>
import { ref } from 'vue'

import ConfigPanel from './widgets/ConfigPanel.vue'
import DefaultPanel from './widgets/DefaultConfig.vue'
import type { Sprite } from '@/models/sprite'

defineProps<{ selectedSprite: Sprite | null }>()

const configType = ref<ConfigType | null>(null)
let timer: NodeJS.Timeout

function startTimer() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (configType.value !== 'default') {
      open('default')
    } else {
      close()
    }
  }, 2000)
}

function open(type: ConfigType | null) {
  configType.value = type
  startTimer()
}

function close() {
  configType.value = null
  clearTimeout(timer)
}

function handleMouseEnter() {
  clearTimeout(timer)
}

defineExpose({
  open,
  close
})
</script>

<template>
  <div class="sprite-quick-config" @mouseenter="handleMouseEnter" @mouseleave="startTimer">
    <template v-if="selectedSprite != null">
      <Transition name="slide-up">
        <DefaultPanel v-if="configType === 'default'" class="panel">Default</DefaultPanel>
        <ConfigPanel v-else-if="configType === 'heading'" class="panel">Heading</ConfigPanel>
        <ConfigPanel v-else-if="configType === 'size'" class="panel">Size</ConfigPanel>
        <ConfigPanel v-else-if="configType === 'pos'" class="panel">pos</ConfigPanel>
      </Transition>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.sprite-quick-config {
  position: absolute;
  bottom: 48px;
  width: 100%;
  left: 50%;
}

.panel {
  position: absolute;
  transform: translateX(-50%);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease-out;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translate(-50%, 30px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, -30px);
}
</style>
