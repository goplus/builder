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
      <svg v-if="loading" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="2.99674" cy="7.99674" r="1.66667" fill="#0BC0CF" />
        <circle opacity="0.5" cx="7.99674" cy="7.99674" r="1.66667" fill="#0BC0CF" />
        <circle cx="12.9967" cy="7.99674" r="1.66667" fill="#0BC0CF" />
      </svg>
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
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M14 27.4375C6.59 27.4375 0.5625 21.41 0.5625 14C0.5625 6.59 6.59 0.5625 14 0.5625C21.41 0.5625 27.4375 6.59 27.4375 14C27.4375 21.41 21.41 27.4375 14 27.4375ZM14 2.4375C7.62375 2.4375 2.4375 7.62375 2.4375 14C2.4375 20.3762 7.62375 25.5625 14 25.5625C20.3762 25.5625 25.5625 20.3762 25.5625 14C25.5625 7.62375 20.3762 2.4375 14 2.4375ZM16.735 19.3125H11.2662C9.65248 19.3125 8.68872 18.3487 8.68872 16.735V11.2662C8.68872 9.65124 9.65248 8.68872 11.2662 8.68872H16.735C18.3487 8.68872 19.3125 9.65248 19.3125 11.2662V16.735C19.3125 18.3487 18.3487 19.3125 16.735 19.3125Z"
            fill="#6E7781"
          />
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
}

.input-wrapper {
  flex: 1 1 0;
  position: relative;
  min-width: 0;
  min-height: 20px;

  font-size: 12px;
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
