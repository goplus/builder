<script lang="ts">
type Position = {
  right: number
  bottom: number
}

type StatePosition = Position & {
  state: State
}

enum State {
  Left = 'left', // The point is on the left side of the screen
  Right = 'right', // The point is on the right side of the screen
  Move = 'move' // The point is moving, it may move to the left or right
}

enum TriggerVisibility {
  Visible = 'visible', // The trigger is visible
  None = '' // The trigger is not visible
}

const panelBoundaryBuffer = [20, 20]
const triggerSnapThreshold = 20
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type WatchSource } from 'vue'
import { useRouter } from 'vue-router'

import { isRectIntersecting, useContentSize } from '@/utils/dom'
import { localStorageRef, timeout, untilNotNull } from '@/utils/utils'
import { untilLoaded } from '@/utils/query'
import { isSignedIn, useSignedInStateQuery } from '@/stores/user'
import { useDraggable, type Offset } from '@/utils/draggable'
import { providePopupContainer, UITooltip } from '@/components/ui'
import CopilotChat from './CopilotChat.vue'
import CopilotTrigger from './CopilotTrigger.vue'
import { useCopilot } from './context'
import { useSpotlight } from '@/utils/spotlight'
import { homePageName } from '@/apps/xbuilder/router'

const copilot = useCopilot()
const spotlight = useSpotlight()
const router = useRouter()

const triggerRef = ref<InstanceType<typeof CopilotTrigger> | null>(null)
const panelRef = ref<HTMLElement>()

const session = computed(() => copilot.currentSession)

const StateIndicator = computed(() => copilot.stateIndicatorComponent)

providePopupContainer(panelRef)

// resize the panel when the window size changes
const documentElementRef = ref(document.documentElement)
const windowSize = useContentSize(documentElementRef)
const triggerSize = useContentSize(() => triggerRef.value?.el ?? null)
const panelSize = useContentSize(panelRef as WatchSource<HTMLElement | null>)

function getCurrentSizes() {
  return {
    windowW: windowSize.value?.width ?? 0,
    windowH: windowSize.value?.height ?? 0,
    triggerW: triggerSize.value?.width ?? 0,
    triggerH: triggerSize.value?.height ?? 0,
    panelW: panelSize.value?.width ?? 0,
    panelH: panelSize.value?.height ?? 0
  }
}

// resize the panel to fit the window size
watch(windowSize, updatePanelClampedPosition)
watch(panelSize, () => {
  if (panelStatePosition.value.state === State.Move) return // close panel
  updatePanelClampedPosition()
})
watch(
  () => [copilot.globalUIEnabled, copilot.active] as const,
  async ([enabled, active], previous) => {
    if (!enabled) return
    await untilNotNull(panelSize)
    if (!copilot.globalUIEnabled) return

    // On initialization, update triggerVisibility and panelStatePosition based on the copilot's active state
    if (previous == null || !previous[0]) {
      updateTriggerVisibility()
      updatePanelClampedPosition()
      if (active) isPanelOutOfBounds.value = false
      return
    }

    if (active) {
      openPanel()
    } else {
      closePanel()
    }
  },
  {
    immediate: true
  }
)

function getDirection(position: Position, elWidth: number) {
  const { windowW } = getCurrentSizes()
  const centerX = position.right + elWidth / 2
  return {
    ...position,
    state: centerX > windowW / 2 ? State.Left : State.Right
  }
}

function isSamePosition(position1: Position, position2: Position) {
  return position1.right === position2.right && position1.bottom === position2.bottom
}

function getClampedPosition(
  { right, bottom, state }: StatePosition,
  elWidth: number,
  elHeight: number,
  buffer = [0, 0]
) {
  const { windowW, windowH } = getCurrentSizes()
  const [topBottom, leftRight] = buffer
  return {
    right: Math.min(windowW - elWidth - leftRight, Math.max(right, leftRight)),
    bottom: Math.min(windowH - elHeight - topBottom, Math.max(bottom, topBottom)),
    state
  }
}

function createCSSAnimation(className: string, el?: HTMLElement) {
  if (!el) {
    return {
      begin: () => {},
      endAndWait: () => Promise.resolve()
    }
  }

  let begined = false
  return {
    begin: async (can = true) => {
      if (!can) return
      // force reflow to ensure the browser correctly triggers animation events on initialization
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      el.offsetHeight
      el.classList.add(className)
      begined = true
    },
    endAndWait: () =>
      new Promise<void>((resolve) => {
        if (!begined) {
          resolve()
          return
        }
        el.addEventListener(
          'transitionend',
          async () => {
            el.classList.remove(className)
            // Wait for the next frame to ensure proper animation sequence
            await timeout()
            resolve()
          },
          { once: true }
        )
      })
  }
}

const position = { right: 0, bottom: 20 }
const draggerRef = ref<HTMLElement>()
const panelStatePosition = localStorageRef('spx-gui-copilot-panel-position', {
  right: 10,
  bottom: 20,
  state: State.Right
})
const isPanelOutOfBounds = ref(false)
const triggerState = ref(panelStatePosition.value.state)
const triggerVisibility = ref(TriggerVisibility.None)

const triggerTooltipDisabled = computed(() => !triggerVisibility.value || panelStatePosition.value.state === State.Move)

function updateTriggerVisibility() {
  triggerVisibility.value = copilot.active ? TriggerVisibility.None : TriggerVisibility.Visible
}

function updatePanelClampedPosition() {
  const { panelW, panelH } = getCurrentSizes()
  if (!panelW || !panelH) return
  panelStatePosition.value = copilot.active ? getOpenedPanelClampedPosition() : getClosedPanelClampedPosition()
}

function updatePanelOutOfBoundsStatus(position: Position) {
  const { panelW, windowW } = getCurrentSizes()
  const swapThreshold = copilot.active ? panelW / 3 : panelW - panelW / 5
  isPanelOutOfBounds.value = position.right < -swapThreshold || position.right > windowW - panelW + swapThreshold
}

function getTriggerClampedPosition(position: Position = panelStatePosition.value) {
  const { panelW, panelH, triggerH, triggerW, windowW, windowH } = getCurrentSizes()
  const { state, bottom } = getDirection(position, triggerW)
  const [topBottom] = panelBoundaryBuffer
  return {
    bottom: Math.min(
      windowH - (triggerH + panelH) / 2 - topBottom,
      Math.max(bottom, (triggerH - panelH) / 2 + topBottom)
    ),
    right: state === State.Left ? windowW : -panelW,
    state
  }
}

function getClosedPanelClampedPosition(position: Position = panelStatePosition.value) {
  const { panelW, panelH, windowW, windowH } = getCurrentSizes()
  const { state, bottom } = getDirection(position, panelW)
  const [topBottom] = panelBoundaryBuffer
  return {
    bottom: Math.min(windowH - panelH - topBottom, Math.max(bottom, topBottom)),
    right: state === State.Left ? windowW : -panelW,
    state
  }
}

function getOpenedPanelClampedPosition(position: Position = panelStatePosition.value) {
  const { panelW, panelH } = getCurrentSizes()
  return getClampedPosition(getDirection(position, panelW), panelW, panelH, panelBoundaryBuffer)
}

async function openPanel() {
  // trigger animation
  const triggerAnimation = createCSSAnimation('animated', panelRef.value)
  await triggerAnimation.begin(!!triggerVisibility.value)
  triggerVisibility.value = TriggerVisibility.None
  await triggerAnimation.endAndWait()

  // panel animation
  const panelAnimation = createCSSAnimation('animated', panelRef.value)
  const newPosition = getOpenedPanelClampedPosition()
  await panelAnimation.begin(!isSamePosition(newPosition, panelStatePosition.value))
  panelStatePosition.value = newPosition
  triggerState.value = newPosition.state
  isPanelOutOfBounds.value = false
  await panelAnimation.endAndWait()

  copilot.open()
}

async function closePanel() {
  const { begin, endAndWait } = createCSSAnimation('animated', panelRef.value)
  const newPosition = getClosedPanelClampedPosition()
  // When the `transition-property` doesn't change, the `transitionend` event can't be triggered.
  await begin(!isSamePosition(newPosition, panelStatePosition.value))
  panelStatePosition.value = newPosition
  triggerState.value = newPosition.state
  isPanelOutOfBounds.value = true
  await endAndWait()

  triggerVisibility.value = TriggerVisibility.Visible
  copilot.close()
}

const onDragStart = () => {
  const statePosition = panelStatePosition.value
  position.right = statePosition.right
  position.bottom = statePosition.bottom
}
const onDragMove = (offset: Offset) => {
  const { panelW } = getCurrentSizes()
  const newPosition = getDirection(
    {
      right: (position.right -= offset.x),
      bottom: (position.bottom -= offset.y)
    },
    panelW
  )
  panelStatePosition.value = {
    ...newPosition,
    state: State.Move
  }
  triggerState.value = newPosition.state
  updatePanelOutOfBoundsStatus(position)
}
const onDragEnd = () => {
  if (!isPanelOutOfBounds.value) {
    openPanel()
  } else {
    closePanel()
  }
}
useDraggable(() => triggerRef.value?.el, {
  onDragStart,
  onDragMove: (offset: Offset) => {
    const { windowW, panelW } = getCurrentSizes()
    const newPosition = {
      right: (position.right -= offset.x),
      bottom: (position.bottom -= offset.y)
    }
    const { right } = newPosition
    let statePosition = newPosition
    if (triggerVisibility.value && (right + panelW < triggerSnapThreshold || windowW - right < triggerSnapThreshold)) {
      statePosition = getTriggerClampedPosition(newPosition)
    } else {
      statePosition = getDirection(newPosition, panelW)
      triggerVisibility.value = TriggerVisibility.None
      updatePanelOutOfBoundsStatus(position)
    }
    panelStatePosition.value = {
      ...statePosition,
      state: State.Move
    }
  },
  onDragEnd
})
useDraggable(draggerRef, {
  onDragStart,
  onDragMove,
  onDragEnd
})

onBeforeUnmount(
  spotlight.on('revealed', async ({ rect }) => {
    const panelEl = panelRef.value
    if (copilot.active && panelEl) {
      const isIntersecting = isRectIntersecting(rect, panelEl.getBoundingClientRect())
      if (isIntersecting) {
        const { innerWidth } = window
        const { left, right } = rect
        const { panelW } = getCurrentSizes()
        const { bottom, state } = panelStatePosition.value

        let newRight = panelStatePosition.value.right
        if (state === State.Left) {
          newRight = left > panelW ? innerWidth : 0
        } else if (state === State.Right) {
          newRight = innerWidth - right > panelW ? 0 : innerWidth
        }

        // panel animation
        const panelAnimation = createCSSAnimation('animated', panelRef.value)
        const newPosition = getOpenedPanelClampedPosition({ right: newRight, bottom })
        await panelAnimation.begin(!isSamePosition(newPosition, panelStatePosition.value))
        panelStatePosition.value = newPosition
        await panelAnimation.endAndWait()
      }
    }
  })
)

// Copilot open handling, implemented here due to high business logic coupling
const signedInStateQuery = useSignedInStateQuery()
const usedCopilotUsersRef = localStorageRef<string[]>('spx-gui-used-copilot-users', [])
watch(
  router.currentRoute,
  (route) => {
    // Open copilot when not signed in and entering the homepage
    if (route.name === homePageName && !isSignedIn()) {
      copilot.open()
    }
  },
  {
    immediate: true
  }
)
/** Whether the current user has not used Copilot. */
const copilotNotUsed = computed(() => {
  const signedInState = signedInStateQuery.data.value
  if (signedInState == null) return false
  return !signedInState.isSignedIn || !usedCopilotUsersRef.value.includes(signedInState.user.username)
})
/** Records that the current user has used Copilot when the specified condition is met. */
async function recordCopilotUsage(shouldRecord: () => boolean) {
  const signedInState = await untilLoaded(signedInStateQuery)
  if (!signedInState.isSignedIn) return
  const { username } = signedInState.user
  const userUsedCopilot = usedCopilotUsersRef.value
  // Skip if condition is not met or user has already been recorded
  if (!shouldRecord() || userUsedCopilot.includes(username)) return

  usedCopilotUsersRef.value = [...userUsedCopilot, username]
}
/** Track whether user has used copilot */
watch(
  () => session.value?.currentRound,
  (round) => recordCopilotUsage(() => round != null)
)
watch(
  () => copilot.active,
  (active) => recordCopilotUsage(() => !active)
)
/** Open copilot for signed-in users on their first copilot use */
onMounted(async () => {
  const signedInState = await untilLoaded(signedInStateQuery)
  if (!signedInState.isSignedIn) return
  if (usedCopilotUsersRef.value.includes(signedInState.user.username)) return
  copilot.open()
})
</script>

<template>
  <div
    v-if="copilot.globalUIEnabled"
    ref="panelRef"
    class="copilot-panel"
    :style="{ right: `${panelStatePosition.right}px`, bottom: `${panelStatePosition.bottom}px` }"
  >
    <div class="body" :class="[triggerState]">
      <UITooltip placement="right" :disabled="triggerTooltipDisabled">
        <template #trigger>
          <CopilotTrigger
            ref="triggerRef"
            :class="['trigger', triggerState, triggerVisibility]"
            :attached-to="triggerState === State.Move ? null : triggerState"
            @click="openPanel()"
          />
        </template>
        <div>{{ $t({ en: 'Copilot', zh: 'Copilot' }) }}</div>
      </UITooltip>
      <div class="body-wrapper" :class="{ 'out-of-bounds': isPanelOutOfBounds }">
        <div ref="draggerRef" class="dragger">
          <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="1.5" cy="1" r="1" fill="#A7B1BB" />
            <circle cx="6" cy="1" r="1" fill="#A7B1BB" />
            <circle cx="10.5" cy="1" r="1" fill="#A7B1BB" />
            <circle cx="1.5" cy="4.5" r="1" fill="#A7B1BB" />
            <circle cx="6" cy="4.5" r="1" fill="#A7B1BB" />
            <circle cx="10.5" cy="4.5" r="1" fill="#A7B1BB" />
          </svg>
        </div>
        <CopilotChat />
      </div>
    </div>
    <div class="footer">
      <div class="footer-wrapper">
        <template v-if="StateIndicator != null">
          <StateIndicator />
          <div class="v-line"></div>
        </template>
        <UITooltip>
          <template #trigger>
            <div class="fold" :class="[triggerState]" @click="copilot.close()">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 12.6667V3.33333" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
                <path
                  :class="{ animating: copilotNotUsed }"
                  d="M3.33301 3.33334L8.66634 8L3.33301 12.6667"
                  stroke-width="1.33333"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </template>
          {{ $t({ en: 'Close Copilot', zh: '关闭 Copilot' }) }}
        </UITooltip>
      </div>
    </div>
  </div>
</template>

<style scoped>
.copilot-panel {
  position: fixed;
  z-index: 9999;
  right: 10px;
  bottom: 20px;
  width: 340px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  gap: 8px;
}

.copilot-panel.animated {
  transition:
    right ease 0.4s,
    bottom ease 0.4s;
}

.body {
  position: relative;
  border-radius: var(--ui-border-radius-lg);
  box-shadow: var(--ui-box-shadow-lg);
  padding: 1px;
  background: linear-gradient(90deg, #72bbff 0%, #c390ff 100%);
}

.trigger {
  position: absolute;
  top: 50%;
  pointer-events: none;
  opacity: 0;
  transform: translate(0, -50%);
  transition:
    transform ease 0.4s,
    opacity ease 0.4s;
}

.trigger.visible {
  pointer-events: all;
  opacity: 1;
}

.trigger.left.visible {
  transform: translate(100%, -50%);
}

.trigger.right.visible {
  transform: translate(-100%, -50%);
}

.body:has(.only-input):has(.visible).left,
.body:has(.only-input):has(.visible).left .body-wrapper {
  border-radius: var(--ui-border-radius-lg) 0 0 var(--ui-border-radius-lg);
}

.body:has(.only-input):has(.visible).right,
.body:has(.only-input):has(.visible).right .body-wrapper {
  border-radius: 0 var(--ui-border-radius-lg) var(--ui-border-radius-lg) 0;
}

.body-wrapper {
  position: relative;
  overflow: hidden;
  transition: opacity ease 0.4s;
  border-radius: var(--ui-border-radius-lg);
  z-index: 2;
}

.body-wrapper.out-of-bounds::after {
  content: '';
  position: absolute;
  top: 14px;
  right: 0;
  bottom: 0;
  left: 0;
  backdrop-filter: blur(1px);
}

.body-wrapper .dragger {
  position: relative;
  height: 14px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: move;
  background-color: var(--ui-color-grey-100);
  transition: background-color ease-in-out 0.3s;
  z-index: 1;
}

.body-wrapper .dragger:hover {
  background-color: var(--ui-color-grey-300);
}

.body-wrapper .output {
  background: var(--ui-color-grey-100);
  max-height: 300px;
  font-size: var(--ui-font-size-sm);
  overflow-y: auto;
  scrollbar-width: thin;
}

.body-wrapper .output:not(:empty) {
  margin-top: 14px;
  padding: 12px 16px 16px 16px;
}

.body-wrapper .output .hi {
  font-size: var(--ui-font-size-2xl);
  line-height: 28px;
  color: var(--ui-color-grey-1000);
}

.body-wrapper .output .tips {
  margin-top: 4px;
  color: var(--ui-color-grey-700);
}

.body-wrapper .output .suggested-questions-wrapper {
  width: 100%;
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.body-wrapper .output .quick-inputs {
  padding-top: 20px;
  display: flex;
  flex-direction: row;
  gap: 8px;
  background: var(--ui-color-grey-100);
}

/**
 * `.suggested-question` here is like UIButton with `size: large` & `type: white`, while with
 * different padding, font style & alignment. So we don't use UIButton here to have better control on the style.
 */

.body-wrapper .output .suggested-question {
  width: 100%;
  padding: 10px 12px;

  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  border: 1px solid var(--ui-color-grey-400);
  color: var(--ui-color-grey-900);
  font-size: var(--ui-font-size-sm);
  line-height: 20px;
  white-space: normal;
  text-align: left;
  transition: 0.3s;
  cursor: pointer;
}

.body-wrapper .output .suggested-question:hover {
  background: var(--ui-color-grey-300);
}

.body-wrapper .output .suggested-question:active {
  background: var(--ui-color-grey-400);
}

.body-wrapper .divider {
  background: linear-gradient(90deg, #72bbff 0%, #c390ff 100%);
  height: 1px;
}

.body-wrapper .input {
  height: 62px;
  overflow: hidden;
}

.footer {
  display: flex;
  justify-content: center;
}

.footer .footer-wrapper {
  z-index: 1;
  display: flex;
  gap: 4px;
  align-items: center;
  height: 36px;
  padding: 0 3px;
  border-radius: 100px;
  border: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-control);
}

.footer .v-line {
  border-right: 1px solid var(--ui-color-grey-400);
  height: 12px;
}

.footer .fold {
  width: 28px;
  height: 28px;
  border-radius: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.3s ease-in;
  stroke: var(--ui-color-grey-800);
  cursor: pointer;
}

@keyframes nudge {
  from {
    transform: translateX(-3px);
  }

  to {
    transform: translateX(1px);
  }
}

.footer .fold .animating {
  animation: nudge 0.5s ease-in-out infinite alternate;
}

.footer .fold.left {
  transform: rotate(180deg);
}

.footer .fold:hover {
  cursor: pointer;
  stroke: var(--ui-color-primary-500);
  background: var(--ui-color-primary-200);
}
</style>
