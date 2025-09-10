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

const panelBoundaryBuffer = [20, 10]
const triggerSnapThreshold = 20
</script>

<script setup lang="ts">
import { computed, ref, watch, type WatchSource } from 'vue'
import { useBottomSticky, useContentSize } from '@/utils/dom'
import { assertNever, localStorageRef, timeout, until } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { initiateSignIn, isSignedIn } from '@/stores/user'
import { useDraggable, type Offset } from '@/utils/draggable'
import { providePopupContainer, UITooltip, UITag } from '@/components/ui'
import CopilotInput from './CopilotInput.vue'
import CopilotRound from './CopilotRound.vue'
import { useCopilot } from './CopilotRoot.vue'
import { type QuickInput, RoundState } from './copilot'
import logoSrc from './logo.png'

const copilot = useCopilot()

const outputRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)
const inputRef = ref<InstanceType<typeof CopilotInput>>()
const panelRef = ref<HTMLElement>()

const session = computed(() => copilot.currentSession)

const rounds = computed(() => {
  if (session.value == null || session.value.rounds.length === 0) return null
  return session.value.rounds
})

const lastRound = computed(() => rounds.value?.at(-1))
const isLastRoundActive = computed(
  () => lastRound.value && ![RoundState.Loading, RoundState.Initialized].includes(lastRound.value.state)
)

const StateIndicator = computed(() => copilot.stateIndicatorComponent)

useBottomSticky(outputRef)

providePopupContainer(panelRef)

// resize the panel when the window size changes
const documentElementRef = ref(document.documentElement)
const { width: windowWidth, height: windowHeight } = useContentSize(documentElementRef)
const { width: triggerWidth, height: triggerHeight } = useContentSize(triggerRef)
const { width: panelWidth, height: panelHeight } = useContentSize(panelRef as WatchSource<HTMLElement | null>)

function getCurrentSizes() {
  return {
    windowW: windowWidth.value ?? 0,
    windowH: windowHeight.value ?? 0,
    triggerW: triggerWidth.value ?? 0,
    triggerH: triggerHeight.value ?? 0,
    panelW: panelWidth.value ?? 0,
    panelH: panelHeight.value ?? 0
  }
}

// resize the panel to fit the window size
watch(() => [windowWidth.value, windowHeight.value], updatePanelClampedPosition)
watch(
  () => [panelWidth.value, panelHeight.value],
  () => {
    if (panelStatePosition.value.state === State.Move) return // close panel
    updatePanelClampedPosition()
  }
)
watch(
  () => copilot.active,
  async (active) => {
    await until(() => !!panelWidth.value)
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
useDraggable(triggerRef, {
  onDragStart,
  onDragMove: (offset: Offset) => {
    const { windowW, panelW } = getCurrentSizes()
    const newPosition = {
      right: (position.right -= offset.x),
      bottom: (position.bottom -= offset.y)
    }
    const { right } = newPosition
    if (triggerVisibility.value && (right + panelW < triggerSnapThreshold || windowW - right < triggerSnapThreshold)) {
      panelStatePosition.value = getTriggerClampedPosition(newPosition)
    } else {
      panelStatePosition.value = getDirection(newPosition, panelW)
      triggerVisibility.value = TriggerVisibility.None
      updatePanelOutOfBoundsStatus(position)
    }
  },
  onDragEnd
})
useDraggable(draggerRef, {
  onDragStart,
  onDragMove,
  onDragEnd
})

const quickInputs = computed(() => copilot.getQuickInputs())

const handleQuickInputClick = useMessageHandle(
  ({ message }: QuickInput) => {
    switch (message.type) {
      case 'text':
        return copilot.addUserTextMessage(message.content)
      case 'event':
        return copilot.notifyUserEvent(message.name, message.detail)
      default:
        assertNever(message)
    }
  },
  { en: 'Failed to send message', zh: '发送消息失败' }
).fn

// TODO: prevent click in copilot panel from closing other dropdowns
</script>

<template>
  <div
    ref="panelRef"
    class="copilot-panel"
    :style="{ right: `${panelStatePosition.right}px`, bottom: `${panelStatePosition.bottom}px` }"
  >
    <div class="body" :class="[triggerState]">
      <div ref="triggerRef" :class="['copilot-trigger', triggerState, triggerVisibility]" @click="openPanel()">
        <div class="copilot-trigger-content">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="12" fill="url(#paint0_linear_931_4390)" />
            <path
              d="M27.1326 16.4061C27.6217 17.2175 28.4776 17.7029 29.4224 17.7029C30.6229 17.714 31.7456 16.8507 32.005 15.6613C32.1791 14.9277 32.0383 14.1644 31.6381 13.5346C27.6773 6.67626 17.5584 5.32387 11.9784 10.9817C10.9521 11.9784 10.1369 13.0862 9.51075 14.2867H9.50704L9.43294 14.4386C9.4033 14.4979 9.36995 14.5572 9.34402 14.6165C9.34402 14.6165 9.34772 14.6165 9.35143 14.6128V14.6202C9.35143 14.6202 9.34772 14.6202 9.34402 14.6202C9.33661 14.635 9.3292 14.6535 9.32179 14.6721L9.26991 14.7795C8.6215 16.143 8.21023 17.5436 8.08055 19.1479C7.99162 20.215 8.0472 21.2784 8.23246 22.301C8.43254 23.3607 8.75119 24.3648 9.17358 25.2985L9.20322 25.3615C9.20692 25.3726 9.21433 25.3838 9.21804 25.3949C9.22916 25.4208 9.24398 25.4468 9.25509 25.469L9.32179 25.6098H9.3292C11.8858 30.7526 17.8585 33.6612 23.4867 32.3088C26.6324 31.727 32.3829 27.9589 31.916 24.4019C31.4121 22.038 28.0923 21.6378 26.9511 23.7609C26.173 24.9984 25.1022 25.8914 23.8721 26.5398C22.8939 27.014 21.812 27.2771 20.693 27.2771C20.2743 27.2771 19.8482 27.2364 19.437 27.1623C19.3517 27.1474 19.2628 27.1326 19.1887 27.1326C19.1183 27.1326 19.0664 27.1474 19.0071 27.1808C18.4588 27.492 18.355 27.5476 17.8104 27.8292L17.2138 28.1552C16.5951 28.5221 15.7318 28.9815 15.3538 28.1404V28.1293C15.2983 27.8996 15.3575 27.681 15.3872 27.5735C15.4316 27.4142 15.4761 27.2512 15.5243 27.0696C15.628 26.6806 15.7355 26.273 15.8837 25.8766C15.9541 25.695 15.9689 25.6394 15.7355 25.4208C13.831 23.6275 13.0788 21.397 13.5012 18.8071C13.7569 17.2361 14.4868 15.88 15.6725 14.7721C17.1212 13.4234 18.7885 12.7417 20.6152 12.7417C21.0932 12.7417 21.5934 12.7898 22.0973 12.8862C22.1825 12.901 22.2751 12.9195 22.3603 12.938H22.3826C24.4056 13.3827 26.0025 14.5461 27.1252 16.4024L27.1326 16.4061Z"
              fill="white"
            />
            <defs>
              <linearGradient id="paint0_linear_931_4390" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
                <stop stop-color="#9A77FF" />
                <stop offset="1" stop-color="#735FFA" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div class="body-wrapper">
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
        <template v-if="isSignedIn()">
          <template v-if="isLastRoundActive">
            <div ref="outputRef" class="output">
              <CopilotRound :round="lastRound!" is-last-round />
              <div v-if="quickInputs.length > 0" class="quick-inputs">
                <UITooltip v-for="(qi, i) in quickInputs" :key="i">
                  {{ $t({ en: `Click to send "${qi.text.en}"`, zh: `点击发送“${qi.text.zh}”` }) }}
                  <template #trigger>
                    <UITag type="boring" @click="handleQuickInputClick(qi)">{{ $t(qi.text) }}</UITag>
                  </template>
                </UITooltip>
              </div>
            </div>
            <div class="divider"></div>
          </template>
          <CopilotInput ref="inputRef" class="input" :class="{ 'only-input': !isLastRoundActive }" :copilot="copilot" />
        </template>
        <template v-else>
          <div class="placeholder">
            <img class="logo" :src="logoSrc" alt="Copilot" />
            <h4 class="title">{{ $t({ en: 'Hi, friend', zh: '你好，小伙伴' }) }}</h4>
            <p class="description">
              {{
                $t({
                  en: 'Please sign in to continue',
                  zh: '请先登录以继续'
                })
              }}
            </p>
            <button class="sign-button" @click="initiateSignIn()">{{ $t({ en: 'Sign in', zh: '登录' }) }}</button>
          </div>
        </template>
      </div>
    </div>
    <div class="footer">
      <div v-if="StateIndicator != null" class="footer-wrapper">
        <StateIndicator />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
$fromColor: #72bbff;
$toColor: #c390ff;
$copilot-trigger-background: linear-gradient(90deg, $fromColor 0%, $toColor 100%);

.copilot-trigger {
  position: absolute;
  width: fit-content;
  height: 64px;
  top: 50%;
  padding: 1px;
  cursor: pointer;
  transform: translate(0, -50%);
  pointer-events: none;
  border-radius: 16px;
  opacity: 0;
  transition:
    transform ease 0.4s,
    opacity ease 0.4s;

  &.visible {
    pointer-events: all;
    opacity: 1;
  }

  &.left {
    padding-left: 0px;
    background: $toColor;
    right: 1px;
    border-top-left-radius: 0px;
    border-bottom-left-radius: 0px;
    &.visible {
      transform: translate(100%, -50%);
    }
    .copilot-trigger-content {
      padding: 0 5px 0 10px;
      border-top-left-radius: 0px;
      border-bottom-left-radius: 0px;
    }
  }
  &.right {
    padding-right: 0px;
    background: $fromColor;
    left: 1px;
    border-top-right-radius: 0px;
    border-bottom-right-radius: 0px;
    &.visible {
      transform: translate(-100%, -50%);
    }
    .copilot-trigger-content {
      padding: 0 10px 0 5px;
      border-top-right-radius: 0px;
      border-bottom-right-radius: 0px;
    }
  }

  .copilot-trigger-content {
    display: flex;
    border-radius: 16px;
    height: 100%;
    align-items: center;
    background: var(--ui-color-grey-100);
  }
}

.copilot-panel {
  position: fixed;
  z-index: 9999; // TODO
  right: 10px;
  bottom: 20px;
  width: 340px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  gap: 8px;

  &.animated {
    transition:
      right ease 0.4s,
      bottom ease 0.4s;
  }
}

.body {
  position: relative;
  border-radius: 16px;
  box-shadow: 0px 16px 32px 0px rgba(36, 41, 47, 0.1);
  padding: 1px;
  background: $copilot-trigger-background;

  &:has(.only-input):has(.visible) {
    &.left,
    &.left .body-wrapper {
      border-radius: 16px 0 0 16px;
    }
    &.right,
    &.right .body-wrapper {
      border-radius: 0 16px 16px 0;
    }
  }
}

.body-wrapper {
  position: relative;
  overflow: hidden;
  transition: opacity ease 0.4s;
  border-radius: 16px;
  z-index: 2;

  .dragger {
    position: absolute;
    height: 14px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: move;
    background: var(--ui-color-grey-100);
  }

  .output {
    background: var(--ui-color-grey-100);
    max-height: 300px;
    overflow-y: auto;
  }

  .divider {
    background: $copilot-trigger-background;
    height: 1px;
  }

  .quick-inputs {
    padding: 0 16px 16px;
    display: flex;
    flex-direction: row;
    gap: 8px;
    background: var(--ui-color-grey-100);
  }

  .input {
    height: 62px;
    overflow: hidden;
  }
}

.footer {
  display: flex;
  justify-content: center;
  .footer-wrapper {
    height: 36px;
    padding: 6px;
    border-radius: 100px;
    border: 1px solid var(--ui-color-grey-400);
    background: var(--ui-color-grey-100);
    box-shadow: 0 8px 28px -16px rgba(0, 0, 0, 0.08);
  }
}

.btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  border: none;
  background: none;
  border-radius: 50%;
  color: var(--ui-color-grey-700);
  transition: background-color 0.2s;
  outline: none;

  &:not(:disabled) {
    cursor: pointer;
    &:hover {
      background-color: var(--ui-color-grey-400);
    }
    &:active {
      background-color: var(--ui-color-grey-500);
    }
  }

  &:disabled {
    cursor: not-allowed;
    color: var(--ui-color-grey-600);
  }
}

.placeholder {
  flex: 1 1 0;
  padding: 0 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--ui-color-grey-100);
  padding: 32px;
  border-radius: 16px;

  .logo {
    width: 90px;
  }

  .title {
    margin-top: 8px;
    font-size: 20px;
    line-height: 1.4;
    color: var(--ui-color-title);
  }

  .description {
    margin-top: 16px;
    font-size: 13px;
    line-height: 20px;
    text-align: center;
    color: var(--ui-color-grey-800);
  }

  .sign-button {
    position: relative;
    border: none;
    width: 78px;
    height: 32px;
    font-weight: 600;
    margin-top: 40px;
    color: var(--ui-color-purple-main);
    background-color: transparent;
    outline: none;

    &::before {
      content: '';
      position: absolute;
      background: $copilot-trigger-background;
      border-radius: 8px;
      padding: 1px;
      inset: 0;
      mask:
        linear-gradient(#000 0 0) content-box,
        linear-gradient(#000 0 0);
      mask-composite: exclude;
    }

    &:hover {
      cursor: pointer;
      background-color: var(--ui-color-purple-100);
    }
  }
}
</style>
