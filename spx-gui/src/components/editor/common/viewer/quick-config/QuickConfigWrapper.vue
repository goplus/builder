<script lang="ts">
import { inject } from 'vue'

export type ConfigType = 'default' | 'pos' | 'rotation' | 'size'

export interface QuickConfigContext {
  configType: Ref<ConfigType>
  updateConfigType: (configType: ConfigType) => void
  pauseAutoBackToDefault: () => void
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
// Tracks manual panel entry so auto-back does not override the user's intent.
const autoBackToDefaultPaused = ref(false)

const quickConfigRef = ref<HTMLElement | undefined>()
let timer: NodeJS.Timeout
let activeInteractions = 0

// Schedule auto-back-to-default when no active interactions (mouse/focus) are happening.
function resetTimer() {
  clearTimeout(timer)
  if (configTypeRef.value === 'default' || autoBackToDefaultPaused.value) {
    return
  }
  timer = setTimeout(() => updateConfigType('default'), 5000)
}

// Switch the active config panel. Also resets `autoBackToDefaultPaused` so that
// externally triggered switches (e.g. transformer drag) always respect auto-back.
// Callers that want to suppress auto-back should call `pauseAutoBackToDefault` after this.
function updateConfigType(configType: ConfigType) {
  configTypeRef.value = configType
  autoBackToDefaultPaused.value = false
  if (activeInteractions === 0) {
    resetTimer()
  }
}

// Suppress the auto-back timer. Used when the user manually opens a sub-panel
// so it stays open until they explicitly click "Back".
function pauseAutoBackToDefault() {
  autoBackToDefaultPaused.value = true
  clearTimeout(timer)
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
  updateConfigType,
  pauseAutoBackToDefault
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
