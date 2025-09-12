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

const snapThreshold = 10
const panelBoundBuffer = [20, 10]
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch, type WatchSource } from 'vue'
import { useBottomSticky, useContentSize } from '@/utils/dom'
import { assertNever, localStorageRef, timeout, until } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import { initiateSignIn, isSignedIn } from '@/stores/user'
import { useDraggable } from '@/utils/draggable'
import { providePopupContainer, UITooltip, UITag } from '@/components/ui'
import CopilotInput from './CopilotInput.vue'
import CopilotRound from './CopilotRound.vue'
import { useCopilot } from './CopilotRoot.vue'
import { type QuickInput, RoundState } from './copilot'
import logoSrc from './logo.png'
import { useResponsive } from '@/components/ui/responsive'

const isMobile = useResponsive('mobile')

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

const StateIndicator = computed(() => copilot.stateIndicatorComponent)

useBottomSticky(outputRef)

providePopupContainer(panelRef)

// resize the panel when the window size changes
const documentElementRef = ref(document.documentElement)
const { width: windowWidth, height: windowHeight } = useContentSize(documentElementRef)
const { width: triggerWidth, height: triggerHeight } = useContentSize(triggerRef)
const { width: panelWidth, height: panelHeight } = useContentSize(panelRef as WatchSource<HTMLElement | null>)

function fixResizeNullable() {
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
watch(
  () => [windowWidth.value, windowHeight.value],
  async () => {
    const { triggerW, panelW } = fixResizeNullable()
    if (triggerW) {
      refreshTriggerPosition(triggerPosition.value)
    }
    if (panelW) {
      refreshPanelPosition(panelPosition.value)
    }
  }
)
watch(
  () => [panelWidth.value, panelHeight.value],
  ([w, h]) => {
    if (!w || !h) return // close panel
    refreshPanelPosition(panelPosition.value)
  }
)
watch(
  () => copilot.active,
  async (active) => {
    if (!active) {
      const { right, bottom, state } = triggerPosition.value
      const { panelW } = fixResizeNullable()
      triggerPosition.value = {
        right: right + panelW / 2,
        bottom,
        state
      }
      await until(() => !!triggerWidth.value)
      if (state === State.Move) {
        snapAnimatedToSide(triggerPosition.value)
      } else {
        refreshTriggerPosition(triggerPosition.value)
      }
    }
  }
)

function getDirection(position: Position, elWidth: number) {
  const { windowW } = fixResizeNullable()
  const centerX = position.right + elWidth / 2
  return {
    ...position,
    state: centerX > windowW / 2 ? State.Left : State.Right
  }
}

function snapToSide(position: Position, elWidth: number) {
  const { windowW } = fixResizeNullable()
  const { state } = getDirection(position, elWidth)
  return {
    ...position,
    state,
    right: state === State.Left ? windowW - elWidth : 0
  }
}

function snapMove(position: Position, elWidth: number) {
  const { windowW } = fixResizeNullable()
  let state = State.Right
  let right = position.right
  if (right < snapThreshold || windowW - (right + elWidth) < snapThreshold) {
    ;({ right, state } = snapToSide(position, elWidth))
  } else {
    state = State.Move
  }
  return {
    ...position,
    state: state,
    right
  }
}

function snapEnd(position: StatePosition, elWidth: number) {
  return getDirection(position, elWidth)
}

function clampToWindowBounds(
  { right, bottom, state }: StatePosition,
  elWidth: number,
  elHeight: number,
  buffer = [0, 0]
) {
  const { windowW, windowH } = fixResizeNullable()
  const [topBottom, leftRight] = buffer
  return {
    right: Math.min(windowW - elWidth - leftRight, Math.max(right, leftRight)),
    bottom: Math.min(windowH - elHeight - topBottom, Math.max(bottom, topBottom)),
    state
  }
}

async function snapAnimatedToSide(position: Position) {
  const triggerEl = triggerRef.value
  if (!triggerEl) return

  const { triggerW } = fixResizeNullable()
  const snapToWindow = snapToSide(position, triggerW)

  triggerEl.addEventListener(
    'transitionend',
    async () => {
      triggerAnimated.value = false
      // Update the position after the transition ends
      await timeout()
      const { triggerW } = fixResizeNullable()
      triggerPosition.value = snapToSide(position, triggerW)
    },
    { once: true }
  )
  triggerAnimated.value = true

  await nextTick()

  triggerPosition.value = {
    ...snapToWindow,
    state: State.Move
  }
}

const position = { right: 0, bottom: 20 }
const triggerPosition = localStorageRef('spx-gui-copilot-trigger-position', { ...position, state: State.Right })
const triggerAnimated = ref(false)
function refreshTriggerPosition(position: StatePosition) {
  const { triggerW, triggerH } = fixResizeNullable()
  triggerPosition.value = clampToWindowBounds(snapToSide(position, triggerW), triggerW, triggerH)
}
useDraggable(triggerRef, {
  onDragStart() {
    const statePosition = triggerPosition.value
    position.right = statePosition.right
    position.bottom = statePosition.bottom
  },
  onDragMove(offset) {
    const { triggerW, triggerH } = fixResizeNullable()
    const statePosition = snapMove(
      {
        right: (position.right -= offset.x),
        bottom: (position.bottom -= offset.y)
      },
      triggerW
    )
    triggerPosition.value = clampToWindowBounds(statePosition, triggerW, triggerH)
  },
  onDragEnd() {
    const statePosition = triggerPosition.value
    if (statePosition.state === State.Move) {
      snapAnimatedToSide(statePosition)
    }
    // Change panelPosition when dragging position.
    const { triggerW } = fixResizeNullable()
    panelPosition.value = snapToSide(statePosition, triggerW)
  }
})

const footerRef = ref<HTMLElement>()
const panelPosition = localStorageRef('spx-gui-copilot-panel-position', { right: 10, bottom: 20, state: State.Right })
function refreshPanelPosition(position: StatePosition) {
  const { panelW, panelH } = fixResizeNullable()
  panelPosition.value = clampToWindowBounds(getDirection(position, panelW), panelW, panelH, panelBoundBuffer)
}
useDraggable(footerRef, {
  onDragStart() {
    const statePosition = panelPosition.value
    position.right = statePosition.right
    position.bottom = statePosition.bottom
  },
  onDragMove(offset) {
    const { panelW, panelH } = fixResizeNullable()
    const statePosition = snapMove(
      {
        right: (position.right -= offset.x),
        bottom: (position.bottom -= offset.y)
      },
      panelW
    )
    panelPosition.value = clampToWindowBounds(statePosition, panelW, panelH, panelBoundBuffer)
  },
  onDragEnd() {
    const { panelW } = fixResizeNullable()
    const statePosition = snapEnd(panelPosition.value, panelW)
    panelPosition.value = statePosition
    // When dragging panelPosition, update triggerPosition and animate it to snap to the edge.
    triggerPosition.value = { ...statePosition, state: State.Move }
  }
})

onMounted(async () => {
  // Fix the position of elements with state State.Move after refresh.
  if (copilot.active) {
    if (panelPosition.value.state === State.Move) {
      triggerPosition.value = panelPosition.value
    }
  } else {
    await until(() => !!triggerWidth.value)
    const { triggerW } = fixResizeNullable()
    let statePosition = triggerPosition.value
    if (statePosition.state === State.Move) {
      statePosition = snapToSide(statePosition, triggerW)
      triggerPosition.value = panelPosition.value = statePosition
    }
  }
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
  <div v-if="!isMobile" class="copilot-ui">
    <div
      v-show="!copilot.active"
      ref="triggerRef"
      :class="['copilot-trigger', { animated: triggerAnimated }, triggerPosition.state]"
      :style="{ right: `${triggerPosition.right}px`, bottom: `${triggerPosition.bottom}px` }"
      @click="copilot.open()"
    >
      <div :class="['copilot-trigger-content', triggerPosition.state]">
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
    <div
      v-show="copilot.active"
      ref="panelRef"
      class="copilot-panel"
      :style="{ right: `${panelPosition.right}px`, bottom: `${panelPosition.bottom}px` }"
    >
      <div class="body">
        <template v-if="isSignedIn()">
          <div
            v-if="lastRound && ![RoundState.Loading, RoundState.Initialized].includes(lastRound.state)"
            ref="outputRef"
            class="output"
          >
            <CopilotRound :round="lastRound" is-last-round />
            <div v-if="quickInputs.length > 0" class="quick-inputs">
              <UITooltip v-for="(qi, i) in quickInputs" :key="i">
                {{ $t({ en: `Click to send "${qi.text.en}"`, zh: `点击发送“${qi.text.zh}”` }) }}
                <template #trigger>
                  <UITag type="boring" @click="handleQuickInputClick(qi)">{{ $t(qi.text) }}</UITag>
                </template>
              </UITooltip>
            </div>
          </div>
          <CopilotInput ref="inputRef" class="input" :copilot="copilot" />
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
      <div ref="footerRef" class="footer">
        <div v-if="StateIndicator != null" style="display: flex">
          <StateIndicator />
        </div>
        <button class="btn" @click="copilot.close()">
          <img class="logo" draggable="false" :src="logoSrc" alt="Copilot" />
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.copilot-ui {
}

.copilot-trigger {
  position: fixed;
  z-index: 9999; // TODO
  right: 0;
  bottom: 20px;

  cursor: pointer;
  border-radius: 16px 0px 0px 16px;
  background: #c390ff;
  background: linear-gradient(90deg, #72bbff 0%, #c390ff 100%);
  box-shadow: 0 4px 8px 0px rgba(0, 0, 0, 0.08);

  &.animated {
    transition: right ease 0.4s;
  }

  &.left {
    border-radius: 0px 16px 16px 0px;
  }

  &.move {
    border-radius: 16px;
  }
}

.copilot-trigger-content {
  display: flex;
  margin: 1px 0 1px 1px;
  padding: 4px 9px 4px 4px;
  border-radius: 15px 0px 0px 15px;
  background: var(--ui-color-grey-100);

  &.left {
    border-radius: 0px 15px 15px 0px;
    padding: 4px 4px 4px 9px;
    margin: 1px 1px 1px 0px;
  }

  &.move {
    border-radius: 15px;
    padding: 4px;
    margin: 1px;
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
}

.body {
  overflow: hidden;
  padding: 1px;
  border-radius: 16px;
  box-shadow: 0px 16px 32px 0px rgba(36, 41, 47, 0.1);
  background: linear-gradient(90deg, #72bbff 0%, #c390ff 100%);

  .output {
    border-radius: 16px 16px 0 0;
    background: var(--ui-color-grey-100);
    max-height: 300px;
    overflow-y: auto;
  }

  .quick-inputs {
    padding: 0 16px 16px;
    display: flex;
    flex-direction: row;
    gap: 8px;
    background: var(--ui-color-grey-100);
  }

  .input {
    border-radius: 16px;
    overflow: hidden;
  }

  .output ~ .input {
    margin-top: 1px;
    border-radius: 0 0 16px 16px;
  }
}

.footer {
  align-self: center;
  display: flex;
  height: 36px;
  padding: 4px 6px;
  justify-content: center;
  align-items: center;
  border-radius: 100px;
  border: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);
  box-shadow: 0 8px 28px -16px rgba(0, 0, 0, 0.08);

  .logo {
    width: 24px;
  }

  &:hover {
    cursor: move;
  }

  & > :not(:last-child)::after {
    content: '|';
    margin: 0 6px;
    color: var(--ui-color-grey-400);
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
      background: linear-gradient(to right, #72bbff 0%, #c390ff 100%);
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
