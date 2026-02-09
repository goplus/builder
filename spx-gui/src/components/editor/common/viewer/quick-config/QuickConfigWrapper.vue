<script lang="ts">
export type ConfigType = 'default' | 'size' | 'rotate' | 'pos'

export const configTypeInjectionKey: InjectionKey<Ref<ConfigType | null>> = Symbol('configType')
export const updateConfigTypeInjectionKey: InjectionKey<(configType: ConfigType) => void> = Symbol('updateConfigType')
</script>

<script lang="ts" setup>
import { provide, ref, type InjectionKey, type Ref, onBeforeUnmount } from 'vue'

import { isInPopup } from '@/components/ui'

const configTypeRef = ref<ConfigType>('default')

const quickConfigRef = ref<HTMLElement | undefined>()
let timer: NodeJS.Timeout
let activeInteractions = 0

function flush() {
  clearTimeout(timer)
  if (configTypeRef.value === 'default') {
    return
  }
  timer = setTimeout(() => updateConfigType('default'), 2000)
}

function updateConfigType(configType: ConfigType) {
  configTypeRef.value = configType
  clearTimeout(timer)
  if (activeInteractions === 0) {
    flush()
  }
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
  quickConfigDom: () => quickConfigRef.value,
  updateConfigType
})

provide(configTypeInjectionKey, configTypeRef)
provide(updateConfigTypeInjectionKey, updateConfigType)

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
