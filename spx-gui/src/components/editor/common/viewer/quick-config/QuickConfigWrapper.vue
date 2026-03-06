<script lang="ts">
import { inject } from 'vue'

export type ConfigType = 'default' | 'pos' | 'rotation' | 'size'

export interface QuickConfigContext {
  configType: Ref<ConfigType>
  updateConfigType: (configType: ConfigType, manual?: boolean) => void
}

const quickConfigInjectionKey: InjectionKey<QuickConfigContext> = Symbol('quickConfig')

export function useQuickConfigContext() {
  const ctx = inject(quickConfigInjectionKey)
  if (ctx == null) throw new Error('useQuickConfigContext should be called inside of QuickConfigWrapper')
  return ctx
}
</script>

<script lang="ts" setup>
import { provide, ref, type InjectionKey, type Ref, onBeforeUnmount } from 'vue'

import { isInPopup } from '@/components/ui'

const configTypeRef = ref<ConfigType>('default')

const quickConfigRef = ref<HTMLElement | undefined>()
let timer: NodeJS.Timeout
let activeInteractions = 0
// Tracks manual panel entry so auto-back does not override the user's intent.
let autoBackToDefaultPaused = false

// Schedule auto-back-to-default when no active interactions (mouse/focus) are happening.
function resetTimer() {
  clearTimeout(timer)
  if (configTypeRef.value === 'default' || autoBackToDefaultPaused) {
    return
  }
  timer = setTimeout(() => updateConfigType('default'), 5000)
}

// Switch the active config panel.
// Pass `manual: true` when the user explicitly opens a sub-panel from `DefaultConfigPanel`,
// so auto-back-to-default is paused until the user clicks "Back".
// Other triggers (e.g. transformer drag) omit this, so auto-back remains enabled.
function updateConfigType(configType: ConfigType, manual?: boolean) {
  configTypeRef.value = configType
  if (manual) {
    autoBackToDefaultPaused = true
    clearTimeout(timer)
    return
  }
  autoBackToDefaultPaused = false
  if (activeInteractions === 0) {
    resetTimer()
  }
}

// Track mouse/focus interactions to pause the auto-back timer while the user
// is actively interacting with the panel.
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

provide(quickConfigInjectionKey, {
  configType: configTypeRef,
  updateConfigType
})

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
