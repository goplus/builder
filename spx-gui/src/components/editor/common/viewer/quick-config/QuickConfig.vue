<script lang="ts">
export const openInjectionKey: InjectionKey<(key: string | null, cb?: () => void) => void> = Symbol('open')
export const closeInjectionKey: InjectionKey<() => void> = Symbol('close')
</script>

<script lang="ts" setup>
import { provide, ref, type InjectionKey } from 'vue'

import { providePopupContainer } from '@/components/ui'
const quickConfigPopupContainerRef = ref<HTMLElement | undefined>()
const typeRef = ref<string | null>(null)
let timer: NodeJS.Timeout

let startTimer: (() => void) | null = null
//
function open(type: string | null, cb?: () => void) {
  activeInteractions = 0
  typeRef.value = type
  clearTimeout(timer)
  startTimer = null
  if (cb != null) {
    startTimer = () => {
      timer = setTimeout(cb, 2000)
    }
    startTimer()
  }
}

function close() {
  typeRef.value = null
  clearTimeout(timer)
  startTimer = null
}

let activeInteractions = 0
function handleInteractionStart() {
  if (startTimer == null) return

  clearTimeout(timer)
  activeInteractions++
}
function handleInteractionEnd() {
  if (startTimer == null) return

  activeInteractions--
  if (activeInteractions <= 0) {
    startTimer()
  }
}

provide(openInjectionKey, open)
provide(closeInjectionKey, close)

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
      <slot :type="typeRef"></slot>
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
