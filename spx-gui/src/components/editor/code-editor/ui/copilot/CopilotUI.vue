<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useBottomSticky } from '@/utils/dom'
import { UIIcon } from '@/components/ui'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'
import CopilotInput from './CopilotInput.vue'
import CopilotRound from './CopilotRound.vue'
import logoSrc from './logo.png'
import type { CopilotController } from '.'

const props = defineProps<{
  controller: CopilotController
}>()

const codeEditorCtx = useCodeEditorUICtx()
const bodyRef = ref<HTMLElement | null>(null)
const inputRef = ref<InstanceType<typeof CopilotInput>>()

function handleClose() {
  props.controller.endChat()
}

const rounds = computed(() => {
  const chat = props.controller.currentChat
  if (chat == null || chat.rounds.length === 0) return null
  return chat.rounds
})

function handleRetry() {
  props.controller.retryCurrentRound()
}

watch(
  () => codeEditorCtx.ui.isCopilotActive,
  async (active) => {
    if (!active) return
    await nextTick()
    inputRef.value?.focus()
  }
)

useBottomSticky(bodyRef)
</script>

<template>
  <div class="copilot-ui">
    <header class="header">
      {{ $t({ en: 'Copilot', zh: 'Copilot' }) }}
      <button class="close">
        <UIIcon class="icon" type="close" @click="handleClose" />
      </button>
    </header>
    <div ref="bodyRef" class="body">
      <ul v-if="rounds != null" class="messages">
        <CopilotRound
          v-for="(round, i) in rounds"
          :key="i"
          :round="round"
          :is-last-round="i === rounds.length - 1"
          @retry="handleRetry()"
        />
      </ul>
      <div v-else class="placeholder">
        <img class="logo" :src="logoSrc" alt="Copilot" />
        <h4 class="title">
          {{
            $t({
              en: 'Ask copilot',
              zh: '向 Copilot 提问'
            })
          }}
        </h4>
        <p class="description">
          {{
            $t({
              en: 'Copilot may help you write or understand code, find and fix problems',
              zh: 'Copilot 可以帮助你编写或理解代码，发现并修复问题'
            })
          }}
        </p>
      </div>
    </div>
    <footer class="footer">
      <CopilotInput ref="inputRef" class="input" :controller="props.controller" />
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.copilot-ui {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  background-color: var(--ui-color-grey-100);
}

.header {
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .close {
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
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--ui-color-grey-400);
    }
    &:active {
      background-color: var(--ui-color-grey-500);
    }

    .icon {
      width: 18px;
      height: 18px;
    }
  }
}

.body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  .placeholder {
    flex: 1 1 0;
    padding: 0 30px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

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
  }
}

.footer {
  padding: 12px 16px;
  display: flex;

  .input {
    flex: 1 1 0;
    min-width: 0;
  }
}
</style>
