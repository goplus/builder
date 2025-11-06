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
  <div class="copilot-input" :class="{ loading }" @click="focus">
    <div class="content">
      <div v-if="loading" class="dot-loading">
        <div class="dot"></div>
      </div>
      <div class="input-wrapper" :data-value="inputStr">
        <textarea
          ref="textareaRef"
          v-model="inputStr"
          class="textarea"
          rows="1"
          :disabled="loading"
          :placeholder="$t(placeholder)"
          @keypress.enter.prevent="handleSubmit"
        ></textarea>
      </div>
      <button class="submit-btn" :class="{ disabled: inputStr.length === 0 }" @click="handleSubmit">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 16.6665L10 3.33317M10 3.33317L5 8.33317M10 3.33317L15 8.33317"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button class="cancel-btn" @click="handleAbort">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="1" y="1" width="30" height="30" rx="15" stroke="#E2D4FF" stroke-width="2" />
          <rect x="11" y="11" width="10" height="10" rx="2" fill="#A074FF" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.content {
  display: flex;
  padding: 12px 14px;
  align-items: center;
  gap: 10px;
  height: 100%;
  background: var(--ui-color-grey-100);

  .dot-loading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2px;
    --speed: 1.3s;

    &::after,
    &::before,
    .dot {
      background-color: var(--ui-color-grey-900);
      border-radius: 50%;
      content: '';
      display: block;
      height: 6px;
      width: 6px;
      transform: scale(0);
      transition: background-color 0.3s ease;
    }

    &::after {
      animation: pulse var(--speed) ease-in-out calc(var(--speed) * -0.125) infinite;
    }
    &::before {
      animation: pulse var(--speed) ease-in-out calc(var(--speed) * -0.375) infinite;
    }
    .dot {
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
  }
}

.input-wrapper {
  flex: 1 1 0;
  position: relative;
  min-width: 0;
  min-height: 20px;

  font-size: 13px;
  line-height: 20px;

  // auto resize based on content height
  &::after {
    display: block;
    content: attr(data-value) ' ';
    pointer-events: none;
    max-height: 40px; // 2 rows
    overflow: hidden;
    visibility: hidden;
    position: static;
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }

  .textarea {
    position: absolute;
    width: 100%;
    height: 100%;
    padding: 0;
    scrollbar-width: thin;
    font-size: inherit;
    line-height: inherit;
  }
}

.textarea {
  font-family: inherit;
  border: none;
  resize: none;
  outline: none;
  color: var(--ui-color-title);
  background: none;

  &::placeholder {
    color: var(--ui-color-hint-2);
  }
}

.submit-btn,
.cancel-btn {
  outline: none;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  border: none;
  cursor: pointer;
  border-radius: 32px;
}

.submit-btn {
  padding: 6px;
  background: var(--Gradient, linear-gradient(180deg, #9a77ff 0%, #735ffa 100%));
  stroke: var(--ui-color-grey-100);
  display: flex;

  &.disabled {
    background: var(--ui-color-grey-400);
    & > svg {
      stroke: var(--ui-color-grey-800);
    }
  }
}

.cancel-btn {
  padding: 0;
  display: none;
  background: transparent;

  & > svg {
    width: 100%;
    height: 100%;
  }
}

.copilot-input.loading {
  .submit-btn {
    display: none;
  }
  .cancel-btn {
    display: flex;
  }
}
</style>
