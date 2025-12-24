<script lang="ts">
export type ConfigType = 'default' | 'size' | 'rotate' | 'pos'

export const configTypeInjectionKey: InjectionKey<Ref<ConfigType | null>> = Symbol('configType')
export const updateConfigTypesInjectionKey: InjectionKey<(configTypes: ConfigType[]) => void> =
  Symbol('updateConfigTypes')
</script>

<script lang="ts" setup>
import { onBeforeUnmount, provide, ref, watch, type InjectionKey, type Ref } from 'vue'

import { providePopupContainer } from '@/components/ui'

const props = defineProps<{
  configTypes: Array<ConfigType>
}>()

const emits = defineEmits<{
  updateConfigTypes: [ConfigType[]]
}>()

const configTypeRef = ref<ConfigType | null>(null)

const quickConfigPopupContainerRef = ref<HTMLElement | undefined>()
const quickConfigRef = ref<HTMLElement | undefined>()
let timer: NodeJS.Timeout
let activeInteractions = 0

watch(
  () => props.configTypes,
  (configTypes) => {
    const configType = configTypes.at(-1) ?? null
    clearTimeout(timer)
    configTypeRef.value = configType
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
  // Keep the last one by default, unless configTypes is explicitly []
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
  activeInteractions = Math.max(0, activeInteractions - 1)
  if (activeInteractions === 0) {
    flush()
  }
}

defineExpose({
  quickConfigDom: () => quickConfigRef.value,
  quickConfigPopupContainerDom: () => quickConfigPopupContainerRef.value
})

provide(configTypeInjectionKey, configTypeRef)
provide(updateConfigTypesInjectionKey, (configTypes: ConfigType[]) => emits('updateConfigTypes', configTypes))

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
