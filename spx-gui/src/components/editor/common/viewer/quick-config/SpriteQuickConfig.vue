<script lang="ts">
export type ConfigType = 'default' | 'heading' | 'size' | 'pos'
</script>

<script lang="ts" setup>
import { ref, watch } from 'vue'

import DefaultPanel from './DefaultConfig.vue'
import type { Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import SizeConfig from './SizeConfig.vue'
import HeadingConfig from './HeadingConfig.vue'
import { providePopupContainer } from '@/components/ui'
import PositionConfig from './PositionConfig.vue'

const props = defineProps<{
  sprite: Sprite | null
  project: Project
}>()

watch(
  () => props.sprite,
  (_, lastSprite) => {
    if (lastSprite != null && configType.value != null) {
      open('default')
    }
  }
)

const quickConfigPopupContainerRef = ref<HTMLElement | undefined>()
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
  stack = 0
  configType.value = type
  startTimer()
}

function close() {
  configType.value = null
  clearTimeout(timer)
}

let stack = 0
function pushStack(e: Event) {
  clearTimeout(timer)
  stack++
}
function popStack(e: Event) {
  stack--
  if (stack <= 0) {
    startTimer()
  }
}

defineExpose({
  open,
  close
})

providePopupContainer(quickConfigPopupContainerRef)
</script>

<template>
  <div
    class="sprite-quick-config"
    @focusin="pushStack"
    @focusout="popStack"
    @mouseenter="pushStack"
    @mouseleave="popStack"
  >
    <template v-if="sprite != null">
      <Transition name="slide-up">
        <DefaultPanel v-if="configType === 'default'" class="panel" :sprite="sprite" :project="project" />
        <HeadingConfig v-else-if="configType === 'heading'" class="panel" :sprite="sprite" :project="project" />
        <SizeConfig v-else-if="configType === 'size'" class="panel" :sprite="sprite" :project="project" />
        <PositionConfig v-else-if="configType === 'pos'" class="panel" :sprite="sprite" :project="project" />
      </Transition>
    </template>

    <!-- Mount the pop-up layer's container here, treating it as part of the component, to facilitate responding to mouseenter/mouseleave events. -->
    <div ref="quickConfigPopupContainerRef"></div>
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
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, 30px);
}

.slide-up-leave-to {
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, -30px);
}
</style>
