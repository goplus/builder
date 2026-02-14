<script lang="ts">
export type ConfigType = 'default' | 'size' | 'heading' | 'pos'

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

function resetTimer() {
  clearTimeout(timer)
  if (configTypeRef.value === 'default') {
    return
  }
  timer = setTimeout(() => updateConfigType('default'), 2000)
}

function updateConfigType(configType: ConfigType) {
  configTypeRef.value = configType
  if (activeInteractions === 0) {
    resetTimer()
  }
}

function handleInteractionStart() {
  clearTimeout(timer)
  activeInteractions++
}
function handleInteractionEnd() {
  activeInteractions = Math.max(0, activeInteractions - 1)
  if (activeInteractions === 0) {
    resetTimer()
  }
}

function handleMouseLeave(e: MouseEvent) {
  const relatedTarget = e.relatedTarget
  // TODO: Temporary. We need a more reliable solution to keep ConfigPanel active.
  // Current issue: If the mouse leaves ConfigPanel and enters something other than a Popup,
  // the logic below fails, causing ConfigPanel back to `default`.
  if (relatedTarget instanceof HTMLElement && isInPopup(relatedTarget)) {
    relatedTarget.addEventListener('mouseleave', handleInteractionEnd, { once: true })
    return
  }
  handleInteractionEnd()
}

defineExpose({
  getElement: () => quickConfigRef.value,
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
