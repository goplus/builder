<script setup lang="ts">
import { computed, ref } from 'vue'
import { RoundState, type Copilot } from './copilot'

const props = defineProps<{
  copilot: Copilot
}>()

const inputStr = ref('')
const textareaRef = ref<HTMLTextAreaElement>()
const round = computed(() => props.copilot.currentSession?.currentRound ?? null)
const loading = computed(() => {
  return round.value != null && [RoundState.Loading, RoundState.InProgress].includes(round.value.state)
})

const placeholder = computed(() => {
  if (round.value != null) {
    if (round.value.state === RoundState.Loading) return { en: 'Thinking', zh: '思考中' }
    if (round.value.state === RoundState.InProgress) return { en: 'Working', zh: '工作中' }
  }
  return { en: 'Input your problem here', zh: '在这里输入你的问题' }
})

function handleSubmit() {
  const problem = inputStr.value.trim()
  if (problem === '') return
  inputStr.value = ''
  props.copilot.addUserTextMessage(problem)
}

function handleAbort() {
  round.value?.abort()
}

function focus() {
  textareaRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="group/loading" :class="{ loading }" @click="focus">
    <div class="content flex h-full items-center gap-2.5 bg-grey-100 px-3.5 py-3">
      <div v-if="loading" class="dot-loading flex items-center justify-between gap-0.5">
        <div class="dot"></div>
      </div>
      <div class="input-wrapper relative min-h-5 min-w-0 flex-[1_1_0] text-13/5" :data-value="inputStr">
        <textarea
          ref="textareaRef"
          v-model="inputStr"
          class="absolute h-full w-full resize-none border-none bg-transparent p-0 text-title outline-none placeholder:text-hint-2"
          rows="1"
          :disabled="loading"
          :placeholder="$t(placeholder)"
          @keypress.enter.prevent="handleSubmit"
        ></textarea>
      </div>
      <button
        class="submit-btn flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full border-none p-1.5 outline-none group-[.loading]/loading:hidden"
        :class="{ disabled: inputStr.length === 0 }"
        @click="handleSubmit"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 16.6665L10 3.33317M10 3.33317L5 8.33317M10 3.33317L15 8.33317"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        class="hidden h-8 w-8 flex-none cursor-pointer rounded-full border-none bg-transparent p-0 outline-none group-[.loading]/loading:flex"
        @click="handleAbort"
      >
        <svg
          class="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
        >
          <rect x="1" y="1" width="30" height="30" rx="15" stroke="#E2D4FF" stroke-width="2" />
          <rect x="11" y="11" width="10" height="10" rx="2" fill="#A074FF" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.dot-loading {
  --speed: 1.3s;
}

.dot-loading::after,
.dot-loading::before,
.dot-loading .dot {
  background-color: var(--ui-color-grey-700);
  border-radius: 50%;
  content: '';
  display: block;
  height: 6px;
  width: 6px;
  transform: scale(0);
  transition: background-color 0.3s ease;
}

.dot-loading::after {
  animation: pulse var(--speed) ease-in-out calc(var(--speed) * -0.125) infinite;
}

.dot-loading::before {
  animation: pulse var(--speed) ease-in-out calc(var(--speed) * -0.375) infinite;
}

.dot-loading .dot {
  animation: pulse var(--speed) ease-in-out calc(var(--speed) * -0.25) infinite both;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(0);
  }

  50% {
    transform: scale(1);
  }
}

.input-wrapper::after {
  /* auto resize based on content height */
  display: block;
  content: attr(data-value) ' ';
  pointer-events: none;
  max-height: 40px;
  overflow: hidden;
  visibility: hidden;
  position: static;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.input-wrapper > textarea {
  font-family: inherit;
  scrollbar-width: thin;
  font-size: inherit;
  line-height: inherit;
}

.submit-btn {
  background: var(--Gradient, linear-gradient(180deg, #9a77ff 0%, #735ffa 100%));
}

.submit-btn.disabled {
  background: var(--ui-color-grey-400);
}

.submit-btn > svg {
  stroke: var(--ui-color-grey-100);
}

.submit-btn.disabled > svg {
  stroke: var(--ui-color-grey-800);
}
</style>
