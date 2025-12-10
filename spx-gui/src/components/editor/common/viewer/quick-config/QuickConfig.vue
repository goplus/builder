<script lang="ts">
export type ConfigType = 'default' | 'size' | 'rotate' | 'pos'

export const configTypeInjectionKey: InjectionKey<WatchSource<ConfigType | null>> = Symbol('configType')
export const updateConfigTypeInjectionKey: InjectionKey<(configTypes: ConfigType[]) => void> = Symbol('updateConfig')
</script>

<script lang="ts" setup>
import { provide, ref, watch, type InjectionKey, type WatchSource } from 'vue'

import { providePopupContainer } from '@/components/ui'

const props = defineProps<{
  configTypes: ConfigType[]
}>()

const emits = defineEmits<{
  updateConfigTypes: [ConfigType[]]
}>()

const configKeyRef = ref<ConfigType | null>(null)

const quickConfigPopupContainerRef = ref<HTMLElement | undefined>()
let timer: NodeJS.Timeout

watch(
  () => props.configTypes,
  (configTypes) => {
    const configType = configTypes.at(-1) ?? null
    activeInteractions = 0
    clearTimeout(timer)
    configKeyRef.value = configType
    flush()
  }
)

function flush() {
  clearTimeout(timer)
  if (props.configTypes.length <= 1) {
    return
  }
  timer = setTimeout(() => {
    emits('updateConfigTypes', props.configTypes.slice(0, -1))
  }, 2000)
}

let activeInteractions = 0
function handleInteractionStart() {
  clearTimeout(timer)
  activeInteractions++
}
function handleInteractionEnd() {
  activeInteractions--
  if (activeInteractions <= 0) {
    flush()
  }
}

provide(configTypeInjectionKey, configKeyRef)
provide(updateConfigTypeInjectionKey, (configTypes: ConfigType[]) => emits('updateConfigTypes', configTypes))

providePopupContainer(quickConfigPopupContainerRef)
</script>

<template>
  <div
    class="quick-config"
    @focusin="handleInteractionStart"
    @focusout="handleInteractionEnd"
    @mouseenter="handleInteractionStart"
    @mouseleave="handleInteractionEnd"
  >
    <Transition name="slide-up">
      <slot></slot>
    </Transition>
    <!-- Mount the pop-up layer's container here, treating it as part of the component, to facilitate responding to mouseenter/mouseleave events. -->
    <div ref="quickConfigPopupContainerRef"></div>
  </div>
</template>

<style lang="scss" scoped>
.quick-config {
  position: absolute;
  bottom: 48px;
  width: 100%;
  height: 0;
  left: 50%;
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
