<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

type ChatMessage = {
  role: 'user' | 'copilot'
  content: string
}

const suggestedQuestions = [
  'What can XBuilder do?',
  'How to create a new project?',
  'Please describe the functions of this page.'
]

const isOpen = ref(false)
const input = ref('')
const messages = ref<ChatMessage[]>([])
const panelRef = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()
const outputRef = ref<HTMLDivElement>()
const panelPosition = ref({ right: 10, bottom: 20 })
const dragStart = ref<{
  pointerX: number
  pointerY: number
  right: number
  bottom: number
} | null>(null)

let resizeTimer: ReturnType<typeof setTimeout> | undefined

const hasMessages = computed(() => messages.value.length > 0)
const panelStyle = computed(() => ({
  right: isOpen.value ? `${panelPosition.value.right}px` : '24px',
  bottom: isOpen.value ? `${panelPosition.value.bottom}px` : '24px'
}))
const panelSide = computed<'left' | 'right'>(() => {
  const panelWidth = panelRef.value?.offsetWidth ?? 340
  return panelPosition.value.right > (window.innerWidth - panelWidth) / 2 ? 'left' : 'right'
})

function getMockAnswer(question: string) {
  if (question.toLowerCase().includes('project')) {
    return 'You can create, remix, and preview local prototype projects here. This preview uses mock data and does not call the server.'
  }
  if (question.toLowerCase().includes('page')) {
    return 'This page mirrors the Builder community experience with local project cards, navigation, search, user pages, and project detail routes.'
  }
  return 'XBuilder helps learners build games with sprites, backdrops, code, tutorials, sharing, and remix workflows.'
}

async function sendMessage(message: string) {
  const content = message.trim()
  if (content === '') return
  messages.value.push({ role: 'user', content })
  messages.value.push({ role: 'copilot', content: getMockAnswer(content) })
  input.value = ''
  await nextTick()
  outputRef.value?.scrollTo({ top: outputRef.value.scrollHeight })
}

function handleSubmit() {
  sendMessage(input.value)
}

function focusInput() {
  inputRef.value?.focus()
}

function clampPanelPosition(position = panelPosition.value) {
  const panel = panelRef.value
  const panelWidth = panel?.offsetWidth ?? 340
  const horizontalBuffer = 10
  const verticalBuffer = 10
  return {
    right: Math.min(
      window.innerWidth - horizontalBuffer - 48,
      Math.max(position.right, horizontalBuffer - panelWidth + 48)
    ),
    bottom: Math.min(window.innerHeight - verticalBuffer - 48, Math.max(position.bottom, verticalBuffer))
  }
}

function persistPanelPosition() {
  window.localStorage.setItem('xbuilder-prototype-copilot-panel-position', JSON.stringify(panelPosition.value))
}

function handleDragStart(event: PointerEvent) {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  target.setPointerCapture(event.pointerId)
  dragStart.value = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    right: panelPosition.value.right,
    bottom: panelPosition.value.bottom
  }
}

function handleDragMove(event: PointerEvent) {
  const start = dragStart.value
  if (start == null) return
  panelPosition.value = clampPanelPosition({
    right: start.right - (event.clientX - start.pointerX),
    bottom: start.bottom - (event.clientY - start.pointerY)
  })
}

function handleDragEnd(event: PointerEvent) {
  const target = event.currentTarget
  if (target instanceof HTMLElement && target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  if (dragStart.value != null) persistPanelPosition()
  dragStart.value = null
}

function handleResize() {
  panelPosition.value = clampPanelPosition()
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(persistPanelPosition, 100)
}

onMounted(() => {
  const rawPosition = window.localStorage.getItem('xbuilder-prototype-copilot-panel-position')
  if (rawPosition != null) {
    try {
      const parsed = JSON.parse(rawPosition) as { right?: number; bottom?: number }
      if (typeof parsed.right === 'number' && typeof parsed.bottom === 'number') {
        panelPosition.value = clampPanelPosition({ right: parsed.right, bottom: parsed.bottom })
      }
    } catch {
      window.localStorage.removeItem('xbuilder-prototype-copilot-panel-position')
    }
  }
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimer)
})
</script>

<template>
  <aside ref="panelRef" class="copilot-panel" :class="{ open: isOpen, closed: !isOpen }" :style="panelStyle" aria-label="Copilot">
    <div v-if="isOpen" class="body">
      <div class="body-wrapper">
        <div
          class="dragger"
          role="button"
          tabindex="0"
          aria-label="Drag Copilot panel"
          @pointerdown.prevent="handleDragStart"
          @pointermove.prevent="handleDragMove"
          @pointerup.prevent="handleDragEnd"
          @pointercancel.prevent="handleDragEnd"
        >
          <svg width="12" height="6" viewBox="0 0 12 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="1.5" cy="1" r="1" fill="#A7B1BB" />
            <circle cx="6" cy="1" r="1" fill="#A7B1BB" />
            <circle cx="10.5" cy="1" r="1" fill="#A7B1BB" />
            <circle cx="1.5" cy="4.5" r="1" fill="#A7B1BB" />
            <circle cx="6" cy="4.5" r="1" fill="#A7B1BB" />
            <circle cx="10.5" cy="4.5" r="1" fill="#A7B1BB" />
          </svg>
        </div>
        <div ref="outputRef" class="output">
          <template v-if="hasMessages">
            <div
              v-for="(message, index) in messages"
              :key="index"
              class="message"
              :class="message.role"
            >
              {{ message.content }}
            </div>
          </template>
          <template v-else>
            <div class="px-2 pb-2">
              <div class="hi">Hi, friend</div>
              <div class="tips">I can help you with XBuilder, just ask!</div>
              <div class="suggested-questions-wrapper">
                <button
                  v-for="question in suggestedQuestions"
                  :key="question"
                  class="suggested-question"
                  type="button"
                  @click="sendMessage(question)"
                >
                  {{ question }}
                </button>
              </div>
            </div>
          </template>
        </div>
        <div class="divider"></div>
        <div class="input" @click="focusInput">
          <div class="content">
            <div class="input-wrapper" :data-value="input">
              <textarea
                ref="inputRef"
                v-model="input"
                rows="1"
                placeholder="Input your problem here"
                @keypress.enter.prevent="handleSubmit"
              ></textarea>
            </div>
            <button
              class="submit-btn"
              :class="{ disabled: input.trim().length === 0 }"
              type="button"
              aria-label="Send message"
              @click="handleSubmit"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M3.78521 8.70313C3.46506 8.38222 3.46459 7.86163 3.78521 7.54102L9.419 1.9082C9.73967 1.58758 10.2602 1.5879 10.5811 1.9082L16.2149 7.54102C16.5356 7.86174 16.5354 8.38225 16.2149 8.70313C15.894 9.02393 15.3736 9.02396 15.0528 8.70313L10.8213 4.47168L10.8213 17.5117C10.8213 17.9654 10.4537 18.3338 10.0001 18.334C9.5466 18.3336 9.17876 17.9652 9.17876 17.5117L9.17876 4.47266L4.94732 8.70313C4.62647 9.02397 4.10605 9.02397 3.78521 8.70313Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="footer-wrapper">
        <button
          class="fold"
          :class="{ left: isOpen && panelSide === 'left' }"
          type="button"
          :aria-label="isOpen ? 'Close Copilot' : 'Open Copilot'"
          @click="isOpen = !isOpen"
        >
          <svg v-if="isOpen" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 12.6667V3.33333" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M3.33301 3.33334L8.66634 8L3.33301 12.6667" stroke-width="1.33333" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else class="copilot-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="12" fill="url(#paint0_linear_prototype_copilot)" />
            <path d="M27.1326 16.4061C27.6217 17.2175 28.4776 17.7029 29.4224 17.7029C30.6229 17.714 31.7456 16.8507 32.005 15.6613C32.1791 14.9277 32.0383 14.1644 31.6381 13.5346C27.6773 6.67626 17.5584 5.32387 11.9784 10.9817C10.9521 11.9784 10.1369 13.0862 9.51075 14.2867H9.50704L9.43294 14.4386C9.4033 14.4979 9.36995 14.5572 9.34402 14.6165L9.32179 14.6721L9.26991 14.7795C8.6215 16.143 8.21023 17.5436 8.08055 19.1479C7.99162 20.215 8.0472 21.2784 8.23246 22.301C8.43254 23.3607 8.75119 24.3648 9.17358 25.2985L9.32179 25.6098H9.3292C11.8858 30.7526 17.8585 33.6612 23.4867 32.3088C26.6324 31.727 32.3829 27.9589 31.916 24.4019C31.4121 22.038 28.0923 21.6378 26.9511 23.7609C26.173 24.9984 25.1022 25.8914 23.8721 26.5398C22.8939 27.014 21.812 27.2771 20.693 27.2771C20.2743 27.2771 19.8482 27.2364 19.437 27.1623C19.3517 27.1474 19.2628 27.1326 19.1887 27.1326C19.1183 27.1326 19.0664 27.1474 19.0071 27.1808C18.4588 27.492 18.355 27.5476 17.8104 27.8292L17.2138 28.1552C16.5951 28.5221 15.7318 28.9815 15.3538 28.1404V28.1293C15.2983 27.8996 15.3575 27.681 15.3872 27.5735C15.4316 27.4142 15.4761 27.2512 15.5243 27.0696C15.628 26.6806 15.7355 26.273 15.8837 25.8766C15.9541 25.695 15.9689 25.6394 15.7355 25.4208C13.831 23.6275 13.0788 21.397 13.5012 18.8071C13.7569 17.2361 14.4868 15.88 15.6725 14.7721C17.1212 13.4234 18.7885 12.7417 20.6152 12.7417C21.0932 12.7417 21.5934 12.7898 22.0973 12.8862C22.1825 12.901 22.2751 12.9195 22.3603 12.938H22.3826C24.4056 13.3827 26.0025 14.5461 27.1252 16.4024L27.1326 16.4061Z" fill="white" />
            <defs>
              <linearGradient id="paint0_linear_prototype_copilot" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
                <stop stop-color="#9A77FF" />
                <stop offset="1" stop-color="#735FFA" />
              </linearGradient>
            </defs>
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.copilot-panel {
  position: fixed;
  z-index: 9999;
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
  justify-content: center;
}

.copilot-panel.closed {
  width: auto;
  gap: 0;
}

.body {
  position: relative;
  border-radius: var(--ui-border-radius-lg);
  box-shadow: var(--ui-box-shadow-lg);
  padding: 1px;
  background: linear-gradient(90deg, #72bbff 0%, #c390ff 100%);
}

.body-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: var(--ui-border-radius-lg);
  z-index: 2;
}

.dragger {
  position: absolute;
  z-index: 1;
  height: 14px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background-color: var(--ui-color-grey-100);
  cursor: move;
  touch-action: none;
  transition: background-color 0.2s;
}

.dragger:hover {
  background-color: var(--ui-color-grey-300);
}

.output {
  margin-top: 14px;
  max-height: 300px;
  overflow-y: auto;
  scrollbar-width: thin;
  background: var(--ui-color-grey-100);
  padding: 12px 16px 16px;
  font-size: var(--ui-font-size-sm);
}

.hi {
  font-size: var(--ui-font-size-2xl);
  line-height: 28px;
  color: var(--ui-color-grey-1000);
}

.tips {
  margin-top: 4px;
  color: var(--ui-color-grey-700);
}

.suggested-questions-wrapper {
  width: 100%;
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggested-question {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--ui-border-radius-md);
  border: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-900);
  font-size: var(--ui-font-size-sm);
  line-height: 20px;
  text-align: left;
  transition: 0.3s;
}

.suggested-question:hover {
  background: var(--ui-color-grey-300);
}

.message {
  max-width: 88%;
  border-radius: var(--ui-border-radius-md);
  padding: 8px 10px;
  line-height: 20px;
  white-space: pre-wrap;
}

.message + .message {
  margin-top: 8px;
}

.message.user {
  margin-left: auto;
  background: var(--ui-color-primary-100);
  color: var(--ui-color-grey-1000);
}

.message.copilot {
  margin-right: auto;
  border: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);
  color: var(--ui-color-grey-900);
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, #72bbff 0%, #c390ff 100%);
}

.input {
  height: 62px;
  overflow: hidden;
}

.content {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--ui-color-grey-100);
  padding: 8px 16px;
}

.input-wrapper {
  position: relative;
  min-width: 0;
  min-height: 20px;
  flex: 1 1 0;
  font-size: var(--ui-font-size-sm);
  line-height: 20px;
}

.input-wrapper::after {
  display: block;
  content: attr(data-value) ' ';
  max-height: 40px;
  overflow: hidden;
  visibility: hidden;
  position: static;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  pointer-events: none;
}

textarea {
  position: absolute;
  height: 100%;
  width: 100%;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  padding: 0;
  color: var(--ui-color-title);
  font: inherit;
  scrollbar-width: thin;
}

textarea::placeholder {
  color: var(--ui-color-hint-2);
}

.submit-btn {
  height: 32px;
  width: 32px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  padding: 6px;
  color: var(--ui-color-grey-100);
  background: linear-gradient(180deg, #9a77ff 0%, #735ffa 100%);
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.submit-btn.disabled {
  color: var(--ui-color-grey-800);
  background: var(--ui-color-grey-400);
}

.footer {
  display: flex;
  justify-content: center;
}

.footer-wrapper {
  z-index: 1;
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 3px;
  border-radius: 100px;
  border: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-control);
}

.copilot-panel.closed .footer-wrapper {
  width: 76px;
  height: 76px;
  border: 2px solid #c7b6ff;
  border-radius: 22px;
  background: var(--ui-color-grey-100);
  padding: 6px;
  box-shadow:
    0 18px 36px rgba(58, 46, 139, 0.18),
    0 0 0 8px rgba(154, 119, 255, 0.08);
}

.fold {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  padding: 0;
  stroke: var(--ui-color-grey-800);
  color: inherit;
  transition:
    background-color 0.2s ease,
    stroke 0.2s ease,
    transform 0.2s ease;
}

.fold.left {
  transform: rotate(180deg);
}

.copilot-panel.closed .fold {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  color: var(--ui-color-grey-100);
}

.fold:hover {
  stroke: var(--ui-color-primary-500);
  background: var(--ui-color-primary-200);
}

.copilot-panel.closed .fold:hover {
  background: transparent;
  filter: brightness(1.05);
}

.copilot-logo {
  width: 100%;
  height: 100%;
  display: block;
  flex: none;
}
</style>
