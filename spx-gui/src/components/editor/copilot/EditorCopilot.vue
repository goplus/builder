<!--
  The editor-owned copilot presentation for the focused (tutorial) layout: a docked trigger that
  sits in the code column's control row, with the chat panel anchored right above it. It is a
  plain layout member of the editor — no viewport math — and shares the app-wide copilot instance,
  so the conversation continues seamlessly from the floating shell.
-->
<script lang="ts">
const panelBottom = 96
const panelTopBuffer = 20
const panelDefaultHeight = 320
const panelMinHeight = 240
</script>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { useContentSize } from '@/utils/dom'
import { localStorageRef } from '@/utils/utils'
import { useDraggable, type Offset } from '@/utils/draggable'
import { providePopupContainer } from '@/components/ui'
import CopilotChat from '@/components/copilot/CopilotChat.vue'
import { useCopilot } from '@/components/copilot/context'
import { RoundState } from '@/components/copilot/copilot'

const copilot = useCopilot()

const isDocked = computed(() => copilot.uiMode === 'docked')

const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement>()
const chatRef = ref<InstanceType<typeof CopilotChat> | null>(null)
const chatDraggerRef = computed(() => chatRef.value?.draggerEl ?? null)

providePopupContainer(panelRef)

/**
 * Whether the copilot is actively producing a reply (waiting for or streaming the response). Keyed
 * off the round state rather than panel visibility, so the trigger animates even while hidden.
 */
const isGenerating = computed(() => {
  const state = copilot.currentSession?.rounds.at(-1)?.state
  return state === RoundState.Loading || state === RoundState.InProgress
})

function handleTriggerClick() {
  if (copilot.active) {
    copilot.collapse()
  } else {
    copilot.open()
  }
}

// Clicking outside the panel dismisses it, like clicking the trigger
watchEffect((onCleanup) => {
  if (!isDocked.value || !copilot.active) return
  const handlePointerDown = (event: PointerEvent) => {
    const target = event.target
    if (!(target instanceof Node)) return
    if (panelRef.value?.contains(target) || triggerRef.value?.contains(target)) return
    copilot.collapse()
  }
  document.addEventListener('pointerdown', handlePointerDown)
  onCleanup(() => document.removeEventListener('pointerdown', handlePointerDown))
})

const panelHeight = localStorageRef('builder-copilot-docked-panel-height', panelDefaultHeight)

const documentElementRef = ref(document.documentElement)
const windowSize = useContentSize(documentElementRef)

function getClampedPanelHeight(height: number) {
  const windowH = windowSize.value?.height ?? window.innerHeight
  const maxHeight = Math.max(panelMinHeight, windowH - panelBottom - panelTopBuffer)
  return Math.min(maxHeight, Math.max(panelMinHeight, height))
}

watch(windowSize, () => {
  panelHeight.value = getClampedPanelHeight(panelHeight.value)
})

// The dragger at the chat's top resizes the panel height
useDraggable(chatDraggerRef, {
  onDragStart: () => {
    panelHeight.value = getClampedPanelHeight(panelHeight.value)
  },
  onDragMove: (offset: Offset) => {
    panelHeight.value = getClampedPanelHeight(panelHeight.value - offset.y)
  }
})
</script>

<template>
  <div v-if="isDocked" class="editor-copilot">
    <button
      ref="triggerRef"
      v-radar="{ name: 'Copilot trigger', desc: 'Click to open or close the Copilot panel' }"
      class="trigger"
      :class="{ active: copilot.active, running: isGenerating }"
      type="button"
      :aria-label="$t({ en: 'Copilot', zh: 'Copilot' })"
      @click="handleTriggerClick"
    >
      <span class="trigger-face">
        <svg
          class="trigger-logo"
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M27.1326 16.4061C27.6217 17.2175 28.4776 17.7029 29.4224 17.7029C30.6229 17.714 31.7456 16.8507 32.005 15.6613C32.1791 14.9277 32.0383 14.1644 31.6381 13.5346C27.6773 6.67626 17.5584 5.32387 11.9784 10.9817C10.9521 11.9784 10.1369 13.0862 9.51075 14.2867H9.50704L9.43294 14.4386C9.4033 14.4979 9.36995 14.5572 9.34402 14.6165C9.34402 14.6165 9.34772 14.6165 9.35143 14.6128V14.6202C9.35143 14.6202 9.34772 14.6202 9.34402 14.6202C9.33661 14.635 9.3292 14.6535 9.32179 14.6721L9.26991 14.7795C8.6215 16.143 8.21023 17.5436 8.08055 19.1479C7.99162 20.215 8.0472 21.2784 8.23246 22.301C8.43254 23.3607 8.75119 24.3648 9.17358 25.2985L9.20322 25.3615C9.20692 25.3726 9.21433 25.3838 9.21804 25.3949C9.22916 25.4208 9.24398 25.4468 9.25509 25.469L9.32179 25.6098H9.3292C11.8858 30.7526 17.8585 33.6612 23.4867 32.3088C26.6324 31.727 32.3829 27.9589 31.916 24.4019C31.4121 22.038 28.0923 21.6378 26.9511 23.7609C26.173 24.9984 25.1022 25.8914 23.8721 26.5398C22.8939 27.014 21.812 27.2771 20.693 27.2771C20.2743 27.2771 19.8482 27.2364 19.437 27.1623C19.3517 27.1474 19.2628 27.1326 19.1887 27.1326C19.1183 27.1326 19.0664 27.1474 19.0071 27.1808C18.4588 27.492 18.355 27.5476 17.8104 27.8292L17.2138 28.1552C16.5951 28.5221 15.7318 28.9815 15.3538 28.1404V28.1293C15.2983 27.8996 15.3575 27.681 15.3872 27.5735C15.4316 27.4142 15.4761 27.2512 15.5243 27.0696C15.628 26.6806 15.7355 26.273 15.8837 25.8766C15.9541 25.695 15.9689 25.6394 15.7355 25.4208C13.831 23.6275 13.0788 21.397 13.5012 18.8071C13.7569 17.2361 14.4868 15.88 15.6725 14.7721C17.1212 13.4234 18.7885 12.7417 20.6152 12.7417C21.0932 12.7417 21.5934 12.7898 22.0973 12.8862C22.1825 12.901 22.2751 12.9195 22.3603 12.938H22.3826C24.4056 13.3827 26.0025 14.5461 27.1252 16.4024L27.1326 16.4061Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </button>
    <div
      v-show="copilot.active"
      ref="panelRef"
      class="panel"
      :style="{ '--docked-copilot-panel-height': `${panelHeight}px` }"
    >
      <div class="frame">
        <CopilotChat ref="chatRef" docked />
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-copilot {
  position: relative;
}

/* The trigger: a white card framing the brand gradient square, mirroring the Run control. */
.trigger {
  display: flex;
  padding: 5px;
  border: 1px solid #b59aff;
  border-radius: 16px;
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-control);
  cursor: pointer;
  transition: transform 0.16s ease;
}

.trigger-face {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(180deg, #9a77ff 0%, #735ffa 100%);
  /* The C mark rides on the gradient in white. */
  color: #fff;
  transition: background 0.16s ease;
}

.trigger:hover .trigger-face,
.trigger.active .trigger-face {
  background: linear-gradient(180deg, #ae92ff 0%, #9181fb 100%);
}

.trigger:hover {
  transform: translateY(-2px);
}

.trigger-logo {
  /* Spun in place while the copilot is working — see `.running`. */
  transform-origin: 50% 50%;
}

.trigger.running .trigger-logo {
  animation: editor-copilot-spin 1.1s linear infinite;
}

@keyframes editor-copilot-spin {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Respect reduced-motion: fall back to a gentle breathing pulse instead of spinning. */
@media (prefers-reduced-motion: reduce) {
  .trigger.running .trigger-logo {
    animation: editor-copilot-pulse 1.6s ease-in-out infinite;
  }

  @keyframes editor-copilot-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
}

.panel {
  position: absolute;
  right: 0;
  /* 18px above the trigger, matching the previous fixed-layout rhythm */
  bottom: calc(100% + 18px);
  width: 360px;
}

.frame {
  position: relative;
  border-radius: var(--ui-border-radius-lg);
  box-shadow: var(--ui-box-shadow-lg);
  padding: 1px;
  background: linear-gradient(90deg, #72bbff 0%, #c390ff 100%);
}

/* The pointer toward the trigger below */
.frame::after {
  content: '';
  position: absolute;
  right: 17px;
  bottom: -6px;
  width: 14px;
  height: 14px;
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-sm);
  transform: rotate(45deg);
  z-index: 1;
}
</style>
