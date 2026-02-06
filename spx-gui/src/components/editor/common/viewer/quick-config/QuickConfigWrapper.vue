<script lang="ts">
export type ConfigType = 'default' | 'size' | 'rotate' | 'pos'

export const configTypeInjectionKey: InjectionKey<Ref<ConfigType | null>> = Symbol('configType')
export const updateConfigTypesInjectionKey: InjectionKey<(configTypes: ConfigType[]) => void> =
  Symbol('updateConfigTypes')
</script>

<script lang="ts" setup>
import { provide, ref, watch, type InjectionKey, type Ref, onBeforeUnmount } from 'vue'

import { isInPopup } from '@/components/ui'

const props = defineProps<{
  configTypes: Array<ConfigType>
}>()

const emits = defineEmits<{
  updateConfigTypes: [ConfigType[]]
}>()

const configTypeRef = ref<ConfigType | null>(null)

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

function handleMouseLeave(e: MouseEvent) {
  const relatedTarget = e.relatedTarget
  if (relatedTarget instanceof HTMLElement && isInPopup(relatedTarget)) {
    handleInteractionStart()
    relatedTarget.addEventListener('mouseleave', handleInteractionEnd, { once: true })
  }
  handleInteractionEnd()
}

defineExpose({
  quickConfigDom: () => quickConfigRef.value
})

provide(configTypeInjectionKey, configTypeRef)
provide(updateConfigTypesInjectionKey, (configTypes: ConfigType[]) => emits('updateConfigTypes', configTypes))

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div
    ref="quickConfigRef"
    class="quick-config"
    @focusin="handleInteractionStart"
    @focusout="handleInteractionEnd"
    @mouseenter="handleInteractionStart"
    @mouseleave="handleMouseLeave"
  >
    <slot></slot>
  </div>
</template>

<style lang="scss">
.quick-config {
  position: absolute;
  padding: 4px;
}
</style>
