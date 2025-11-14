<script setup lang="ts">
import { computed } from 'vue'
import { RoundState, type Round } from './copilot'
import MarkdownView from './MarkdownView.vue'
import BaseFailed from './feedback/BaseFailed.vue'
import BaseCancelled from './feedback/BaseCancelled.vue'
import { apiExceptionComponentMap } from './feedback/api-exception'

const props = defineProps<{
  round: Round
  isLastRound: boolean
}>()

const Feedback = computed(() => {
  const round = props.round
  if (round.state === RoundState.Failed) {
    const apiExceptionCode = round.apiExceptionCode
    if (apiExceptionCode != null && apiExceptionComponentMap.has(apiExceptionCode)) {
      return apiExceptionComponentMap.get(apiExceptionCode)
    }
    return BaseFailed
  }
  if (round.state === RoundState.Cancelled) {
    return BaseCancelled
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
    <div v-if="round.state !== RoundState.Initialized" class="state">
      <template v-if="Feedback != null">
        <Feedback :round="round" :is-last-round="isLastRound" />
      </template>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.copilot-round {
}

.answer {
  align-self: stretch;
}

.state {
  display: flex;
  align-self: stretch;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  font-size: 12px;
}

.answer ~ .state {
  padding-top: 0;
}
</style>
