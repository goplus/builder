<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChatTopicKind, RoundState, type CopilotController } from '.'

const props = defineProps<{
  controller: CopilotController
}>()

const inputStr = ref('')
const textareaRef = ref<HTMLTextAreaElement>()
const round = computed(() => {
  const chat = props.controller.currentChat
  if (chat == null || chat.rounds.length === 0) return null
  return chat.rounds[chat.rounds.length - 1]
})
const loading = computed(() => {
  return round.value != null && round.value.state === RoundState.Loading
})

const placeholder = computed(() => {
  if (loading.value) return { en: 'Thinking...', zh: '思考中...' }
  return { en: 'Input your problem here', zh: '在这里输入你的问题' }
})

function handleSubmit() {
  const problem = inputStr.value.trim()
  if (problem === '') return // TODO: show hint?
  inputStr.value = ''
  if (props.controller.currentChat == null) {
    props.controller.startChat({
      kind: ChatTopicKind.Inspire,
      problem
    })
  } else {
    props.controller.askProblem(problem)
  }
}

function handleCancel() {
  props.controller.cancelCurrentRound()
}

function focus() {
  textareaRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="copilot-input" :class="{ loading }" @click="focus">
    <div class="content">
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
      <button class="submit-btn" @click="handleSubmit">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M18.6357 15.6701L20.3521 10.5208C21.8516 6.02242 22.6013 3.77322 21.414 2.58595C20.2268 1.39869 17.9776 2.14842 13.4792 3.64788L8.32987 5.36432C4.69923 6.57453 2.88392 7.17964 2.36806 8.06698C1.87731 8.91112 1.87731 9.95369 2.36806 10.7978C2.88392 11.6852 4.69923 12.2903 8.32987 13.5005C8.77981 13.6505 9.28601 13.5434 9.62294 13.2096L15.1286 7.75495C15.4383 7.44808 15.9382 7.45041 16.245 7.76015C16.5519 8.06989 16.5496 8.56975 16.2398 8.87662L10.8231 14.2432C10.4518 14.6111 10.3342 15.1742 10.4995 15.6701C11.7097 19.3007 12.3148 21.1161 13.2022 21.6319C14.0463 22.1227 15.0889 22.1227 15.933 21.6319C16.8204 21.1161 17.4255 19.3008 18.6357 15.6701Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <button class="cancel-btn" @click="handleCancel">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 22.75C6.072 22.75 1.25 17.928 1.25 12C1.25 6.072 6.072 1.25 12 1.25C17.928 1.25 22.75 6.072 22.75 12C22.75 17.928 17.928 22.75 12 22.75ZM12 2.75C6.899 2.75 2.75 6.899 2.75 12C2.75 17.101 6.899 21.25 12 21.25C17.101 21.25 21.25 17.101 21.25 12C21.25 6.899 17.101 2.75 12 2.75ZM14.188 16.25H9.81299C8.52199 16.25 7.75098 15.479 7.75098 14.188V9.81299C7.75098 8.52099 8.52199 7.75098 9.81299 7.75098H14.188C15.479 7.75098 16.25 8.52199 16.25 9.81299V14.188C16.25 15.479 15.479 16.25 14.188 16.25Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.copilot-input {
  border-radius: 8px;
  background: #c390ff;
  background: linear-gradient(90deg, #72bbff 0%, #c390ff 100%);
}

.content {
  display: flex;
  margin: 1px;
  padding: 7px 11px;
  align-items: center;
  gap: 16px;
  border-radius: 7px;
  background: var(--ui-color-grey-100);
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
    max-height: 60px; // 3 rows
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
    scrollbar-width: thin;
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
  flex: 0 0 auto;
  display: flex;
  padding: 8px;
  justify-content: center;
  align-items: center;
  gap: 8px;
  border: none;
  cursor: pointer;
  border-radius: 12px;
  color: var(--ui-color-grey-100);
  background: var(--Gradient, linear-gradient(180deg, #9a77ff 0%, #735ffa 100%));
}

.submit-btn {
  display: flex;
}
.cancel-btn {
  display: none;
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
