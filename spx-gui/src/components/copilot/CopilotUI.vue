<script setup lang="ts">
import { computed, nextTick, ref, watch, provide, markRaw } from 'vue'
import { useBottomSticky } from '@/utils/dom'
import { UIIcon } from '@/components/ui'
import CopilotInput from '@/components/copilot/CopilotInput.vue'
import CopilotRound from '@/components/copilot/CopilotRound.vue'
import logoSrc from '../editor/code-editor/ui/copilot/logo.png'
import type { CopilotController } from './index'
const props = defineProps<{
  controller: CopilotController
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const bodyRef = ref<HTMLElement | null>(null)
const inputRef = ref<InstanceType<typeof CopilotInput>>()

const executedMcpTools = ref(new Set<string>())
provide('executedMcpTools', executedMcpTools)

const cachedRounds = ref<any[]>([])
  watch(
  () => props.controller.currentChat?.rounds,
  (newRounds) => {
    if (!newRounds) {
      cachedRounds.value = []
      return
    }
    
    // 更新缓存，只添加新的轮次
    if (cachedRounds.value.length < newRounds.length) {
      // 有新的轮次添加
      for (let i = cachedRounds.value.length; i < newRounds.length; i++) {
        // 使用 markRaw 标记对象，防止深层响应式转换
        const newRound = { ...newRounds[i] }
        
        // 特别处理 answer 部分，避免深层响应式
        if (newRound.answer) {
          const answerValue = newRound.answer.value;
          newRound.answer = {
            ...newRound.answer,
            // 确保 value 保持其原始类型
            value: answerValue
          };
          // 标记整个 answer 对象为非响应式
          newRound.answer = markRaw(newRound.answer);
        }
        
        cachedRounds.value.push(markRaw(newRound))
      }
    } else if (newRounds.length === cachedRounds.value.length) {
      // 轮次数量相同，但最后一个可能更新了
      const lastIndex = newRounds.length - 1
      if (newRounds[lastIndex]?.state !== cachedRounds.value[lastIndex]?.state ||
          newRounds[lastIndex]?.answer !== cachedRounds.value[lastIndex]?.answer) {
        
        const updatedRound = {...newRounds[lastIndex]};
        if (updatedRound.answer) {
          const answerValue = updatedRound.answer.value;
          updatedRound.answer = {
            ...updatedRound.answer,
            value: answerValue // Keep the original value without marking it raw
          };
          // Mark the entire answer object as raw after setting properties
          updatedRound.answer = markRaw(updatedRound.answer);
        }
        cachedRounds.value[lastIndex] = markRaw(updatedRound);
      }
    } else if (newRounds.length < cachedRounds.value.length) {
      // 轮次减少了，重新设置整个缓存
      cachedRounds.value = newRounds.map(round => {
        const newRound = { ...round }

        if (newRound.answer) {
          const answerValue = newRound.answer.value;
          newRound.answer = {
            ...newRound.answer,
            // 确保 value 保持其原始类型
            value: answerValue
          };
          // 标记整个 answer 对象为非响应式
          newRound.answer = markRaw(newRound.answer);
        }
        
        cachedRounds.value.push(markRaw(newRound))
      })
    }
  },
  { deep: true }
)

function handleClose() {
  props.controller.endChat()
  executedMcpTools.value.clear()
  emit('close')
}

const rounds = computed(() => {
  return cachedRounds.value.length > 0 ? cachedRounds.value : null
})

function handleRetry() {
  props.controller.retryCurrentRound()
}

watch(
  () => props.controller.currentChat,
  async (chat) => {
    if (!chat) return
    await nextTick()
    inputRef.value?.focus()
  },
  { immediate: true }
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
