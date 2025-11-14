<script setup lang="ts">
import { computed } from 'vue'
import { RoundState, type Round } from './copilot'
import MarkdownView from './MarkdownView.vue'
import { ApiExceptionCode } from '@/apis/common/exception'
import SignInTip from './feedback/SignInTip.vue'

const props = defineProps<{
  round: Round
  isLastRound: boolean
}>()

const retryable = computed(() => {
  return props.isLastRound && [RoundState.Cancelled, RoundState.Failed].includes(props.round.state)
})

function handleRetry() {
  props.round.retry()
}

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
      <SignInTip
        v-if="round.state === RoundState.Failed && round.apiExceptionCode === ApiExceptionCode.errorUnauthorized"
        :round="round"
      />
      <template v-else>
        <div v-if="round.state === RoundState.Cancelled" class="cancelled">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 3.33334C6.31804 3.33334 3.33337 6.31801 3.33337 10C3.33337 13.682 6.31804 16.6667 10 16.6667C13.682 16.6667 16.6667 13.682 16.6667 10C16.6667 6.31801 13.682 3.33334 10 3.33334ZM9.50004 7.00001C9.50004 6.72401 9.72404 6.50001 10 6.50001C10.276 6.50001 10.5 6.72401 10.5 7.00001V10.0474C10.5 10.3234 10.276 10.5474 10 10.5474C9.72404 10.5474 9.50004 10.3234 9.50004 10.0474V7.00001ZM10.0134 13C9.64539 13 9.3433 12.7013 9.3433 12.3333C9.3433 11.9653 9.63871 11.6667 10.0067 11.6667H10.0134C10.3821 11.6667 10.6801 11.9653 10.6801 12.3333C10.6801 12.7013 10.3814 13 10.0134 13Z"
              fill="#FAA135"
            />
          </svg>
          {{ $t({ en: 'Cancelled', zh: '已取消' }) }}
        </div>
        <div v-if="round.state === RoundState.Failed" class="failed">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M9.99998 3.33331C6.31998 3.33331 3.33331 6.31998 3.33331 9.99998C3.33331 13.68 6.31998 16.6666 9.99998 16.6666C13.68 16.6666 16.6666 13.68 16.6666 9.99998C16.6666 6.31998 13.68 3.33331 9.99998 3.33331ZM12.3533 11.6466C12.5466 11.84 12.5466 12.16 12.3533 12.3533C12.2533 12.4533 12.1266 12.5 12 12.5C11.8733 12.5 11.7466 12.4533 11.6466 12.3533L9.99998 10.7066L8.35331 12.3533C8.25331 12.4533 8.12665 12.5 7.99998 12.5C7.87331 12.5 7.74665 12.4533 7.64665 12.3533C7.45331 12.16 7.45331 11.84 7.64665 11.6466L9.29331 9.99998L7.64665 8.35333C7.45331 8.16 7.45331 7.83996 7.64665 7.64663C7.83998 7.45329 8.15998 7.45329 8.35331 7.64663L9.99998 9.29331L11.6466 7.64663C11.84 7.45329 12.16 7.45329 12.3533 7.64663C12.5466 7.83996 12.5466 8.16 12.3533 8.35333L10.7066 9.99998L12.3533 11.6466Z"
              fill="#EF4149"
            />
          </svg>
          {{ $t(round.error!) }}
        </div>
        <button v-if="retryable" class="retry" @click="handleRetry">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M7.44446 2.44446L9.11112 4.11112M9.11112 4.11112L7.44446 5.77779M9.11112 4.11112H5.11112C4.1777 4.11112 3.71099 4.11112 3.35447 4.29278C3.04087 4.45257 2.7859 4.70754 2.62611 5.02114C2.44446 5.37766 2.44446 5.84437 2.44446 6.77779V9.94446C2.44446 10.2025 2.44446 10.3315 2.45872 10.4398C2.55718 11.1877 3.14569 11.7762 3.89358 11.8746C4.00189 11.8889 4.13089 11.8889 4.3889 11.8889M6.8889 11.8889H10.8889C11.8223 11.8889 12.289 11.8889 12.6456 11.7072C12.9592 11.5475 13.2141 11.2925 13.3739 10.9789C13.5556 10.6224 13.5556 10.1557 13.5556 9.22224V6.05557C13.5556 5.79756 13.5556 5.66855 13.5413 5.56025C13.4428 4.81236 12.8543 4.22384 12.1064 4.12538C11.9981 4.11112 11.8691 4.11112 11.6111 4.11112M6.8889 11.8889L8.55557 13.5556M6.8889 11.8889L8.55557 10.2222"
              stroke="currentColor"
              stroke-width="1.33"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ $t({ en: 'Retry', zh: '重试' }) }}
        </button>
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

.cancelled,
.failed {
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: stretch;

  line-height: 20px;
}

.cancelled {
  color: var(--ui-color-yellow-main);
}

.failed {
  color: var(--ui-color-red-main);
}

.retry {
  margin-left: 28px;
  padding: 3px 0px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: inherit;

  border: none;
  background: none;
  cursor: pointer;
  color: var(--ui-color-text);
  border-radius: 4px;
  transition: 0.2s;

  &:hover {
    color: var(--ui-color-grey-700);
  }
}
</style>
