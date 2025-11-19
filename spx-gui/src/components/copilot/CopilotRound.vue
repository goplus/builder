<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RoundState, type Round } from './copilot'
import MarkdownView from './MarkdownView.vue'
import BaseFailed from './feedback/BaseFailed.vue'
import BaseCancelled from './feedback/BaseCancelled.vue'
import { ApiExceptionCode } from '@/apis/common/exception'
import SignInTip from './feedback/api-exception/SignInTip.vue'
import QuotaExceeded from './feedback/api-exception/QuotaExceeded.vue'

const props = defineProps<{
  round: Round
  isLastRound: boolean
}>()

const apiExceptionComponents: Record<number, Component> = {
  [ApiExceptionCode.errorUnauthorized]: SignInTip,
  [ApiExceptionCode.errorQuotaExceeded]: QuotaExceeded
}

const feedbackProps = computed(() => ({
  round: props.round,
  isLastRound: props.isLastRound
}))

const ApiExceptionComponent = computed(() => {
  const round = props.round
  const apiExceptionCode = round.apiExceptionCode
  if (apiExceptionCode != null && apiExceptionComponents[apiExceptionCode] != null) {
    return apiExceptionComponents[apiExceptionCode]
  }
  return null
})

const resultContent = computed<string | null>(() => {
  const copilotMessages: string[] = []
  for (const message of props.round.resultMessages) {
    if (message.role === 'copilot') copilotMessages.push(message.content)
  }
  // TODO: render in-progress message and other messages separately to improve performance & user experience
  if (props.round.inProgressCopilotMessageContent != null) {
    copilotMessages.push(props.round.inProgressCopilotMessageContent)
  }
  if (copilotMessages.length === 0) return null
  return copilotMessages.join('\n\n')
})
</script>

<template>
  <section class="copilot-round">
    <MarkdownView v-if="resultContent != null" class="answer" :value="resultContent" />
    <div v-if="round.state !== RoundState.Initialized">
      <template v-if="round.state === RoundState.Failed">
        <template v-if="ApiExceptionComponent != null">
          <ApiExceptionComponent v-bind="feedbackProps" :exception-meta="round.apiExceptionMeta" />
        </template>
        <BaseFailed v-else v-bind="feedbackProps" />
      </template>
      <BaseCancelled v-else-if="round.state === RoundState.Cancelled" v-bind="feedbackProps" />
    </div>
  </section>
</template>

<style lang="scss" scoped>
.copilot-round {
}

.answer {
  align-self: stretch;
}
</style>
