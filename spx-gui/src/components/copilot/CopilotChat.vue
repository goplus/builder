<script setup lang="ts">
import { computed, ref } from 'vue'

import { useBottomSticky } from '@/utils/dom'
import { assertNever } from '@/utils/utils'
import { useMessageHandle } from '@/utils/exception'
import type { LocaleMessage } from '@/utils/i18n'
import { UIButton, UITooltip } from '@/components/ui'
import CopilotInput from './CopilotInput.vue'
import CopilotRound from './CopilotRound.vue'
import { useCopilot } from './context'
import { type QuickInput, RoundState } from './copilot'

const copilot = useCopilot()
const outputRef = ref<HTMLElement | null>(null)
const session = computed(() => copilot.currentSession)
const activeRound = computed(() => {
  const round = session.value?.rounds.at(-1)
  if (round == null || [RoundState.Loading, RoundState.Initialized].includes(round.state)) return null
  return round
})

const suggestedQuestions: LocaleMessage[] = [
  { en: 'What can XBuilder do?', zh: 'XBuilder 可以做什么？' },
  { en: 'How to create a new project?', zh: '如何创建一个新项目？' },
  { en: 'Please describe the functions of this page.', zh: '介绍下这个页面有哪些功能。' }
]
const handleSuggestedPromptClick = useMessageHandle((message: string) => copilot.addUserTextMessage(message), {
  en: 'Failed to send message',
  zh: '发送消息失败'
}).fn
const quickInputs = computed(() => copilot.getQuickInputs())
useBottomSticky(outputRef)
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
</script>

<template>
  <div class="overflow-hidden bg-grey-100">
    <div
      v-if="activeRound != null || session == null"
      ref="outputRef"
      class="max-h-75 overflow-y-auto px-4 pt-3 pb-4 text-sm"
    >
      <template v-if="activeRound != null">
        <CopilotRound :round="activeRound" is-last-round />
        <div v-if="quickInputs.length > 0" class="flex gap-2 pt-5">
          <UITooltip v-for="(qi, i) in quickInputs" :key="i">
            {{ $t({ en: `Click to send "${qi.text.en}"`, zh: `点击发送“${qi.text.zh}”` }) }}
            <template #trigger
              ><UIButton type="neutral" @click="handleQuickInputClick(qi)">{{ $t(qi.text) }}</UIButton></template
            >
          </UITooltip>
        </div>
      </template>
      <template v-else-if="session == null">
        <div class="px-2 pb-2">
          <div class="text-2xl leading-7 text-grey-1000">{{ $t({ en: 'Hi, friend', zh: '你好，小伙伴' }) }}</div>
          <div class="mt-1 text-grey-700">
            {{ $t({ en: 'I can help you with XBuilder, just ask!', zh: '我可以帮助你了解并使用 XBuilder，尽管问！' }) }}
          </div>
          <button
            v-for="question in suggestedQuestions"
            :key="question.en"
            class="mt-2 w-full cursor-pointer rounded-md border border-grey-400 bg-grey-100 px-3 py-2.5 text-left text-sm text-grey-900 hover:bg-grey-300"
            @click="handleSuggestedPromptClick($t(question))"
          >
            {{ $t(question) }}
          </button>
        </div>
      </template>
    </div>
    <div v-if="activeRound != null || session == null" class="h-px bg-linear-to-r from-[#72bbff] to-[#c390ff]"></div>
    <CopilotInput class="h-15.5 overflow-hidden" :class="{ 'only-input': activeRound == null }" :copilot="copilot" />
  </div>
</template>
