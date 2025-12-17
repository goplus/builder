<script lang="ts">
export type DefaultConfigType = {
  type: 'default'
}

export type SizeConfigType = {
  type: 'size'
  size: number
}

export type RotateConfigType = {
  type: 'rotate'
  rotate: number
}

export type PosConfigType = {
  type: 'pos'
  x: number
  y: number
}

export type ConfigType = DefaultConfigType | SizeConfigType | RotateConfigType | PosConfigType

export const configTypeInjectionKey: InjectionKey<Ref<ConfigType | null>> = Symbol('configType')
export const updateConfigTypeInjectionKey: InjectionKey<(configTypes: ConfigType[]) => void> = Symbol('updateConfig')
</script>

<script lang="ts" setup>
import { onBeforeUnmount, provide, ref, watch, type InjectionKey, type Ref } from 'vue'

import { providePopupContainer } from '@/components/ui'

const props = defineProps<{
  configTypes: Array<DefaultConfigType | SizeConfigType | RotateConfigType | PosConfigType>
}>()

const emits = defineEmits<{
  updateConfigTypes: [ConfigType[]]
}>()

const configKeyRef = ref<ConfigType | null>(null)

const quickConfigPopupContainerRef = ref<HTMLElement | undefined>()
const quickConfigRef = ref<HTMLElement | undefined>()
let timer: NodeJS.Timeout
let activeInteractions = 0

watch(
  () => props.configTypes,
  (configTypes) => {
    const configType = configTypes.at(-1) ?? null
    clearTimeout(timer)
    if (configType?.type !== configKeyRef.value?.type) {
      activeInteractions = 0
    }
    configKeyRef.value = configType
    if (activeInteractions === 0) {
      flush()
    }
  },
  {
    immediate: true
  }
)

function flush() {
  clearTimeout(timer)
  if (props.configTypes.length <= 1) {
    return
  }
  timer = setTimeout(() => emits('updateConfigTypes', props.configTypes.slice(0, -1)), 2000)
}

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

defineExpose({
  quickConfigDom: () => quickConfigRef.value,
  quickConfigPopupContainerDom: () => quickConfigPopupContainerRef.value
})

provide(configTypeInjectionKey, configKeyRef)
provide(updateConfigTypeInjectionKey, (configTypes: ConfigType[]) => emits('updateConfigTypes', configTypes))

providePopupContainer(quickConfigPopupContainerRef)

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    ref="quickConfigRef"
    class="quick-config"
    @focusin="handleInteractionStart"
    @focusout="handleInteractionEnd"
    @mouseenter="handleInteractionStart"
    @mouseleave="handleInteractionEnd"
  >
    <slot></slot>
    <!-- Mount the pop-up layer's container here, treating it as part of the component, to facilitate responding to mouseenter/mouseleave events. -->
    <div ref="quickConfigPopupContainerRef"></div>
  </div>
</template>

<style lang="scss">
.quick-config {
  position: absolute;
}
</style>
