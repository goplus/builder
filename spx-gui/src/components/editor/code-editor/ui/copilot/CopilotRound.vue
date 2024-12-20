<script setup lang="ts">
import { computed } from 'vue'
import { RoundState, type Round } from '.'
import MarkdownView from '../markdown/MarkdownView.vue'
import UserMessage from './UserMessage.vue'

const props = defineProps<{
  round: Round
  isLastRound: boolean
}>()

const emit = defineEmits<{
  retry: []
}>()

const retryable = computed(() => {
  return props.isLastRound && [RoundState.Cancelled, RoundState.Failed].includes(props.round.state)
})

function handleWrapper(wrapper: unknown) {
  if (!props.isLastRound) return
  if (wrapper == null) return
  ;(wrapper as HTMLElement).scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <section :ref="handleWrapper" class="copilot-round">
    <UserMessage :content="round.problem" />
    <MarkdownView v-if="round.answer != null" class="answer" v-bind="round.answer" />
    <div v-else class="abnormal">
      <div v-if="round.state === RoundState.Loading" class="loading">
        <svg
          class="loading-icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="6" cy="12" r="2" fill="#0BC0CF" />
          <circle opacity="0.5" cx="12" cy="12" r="2" fill="#0BC0CF" />
          <circle cx="18" cy="12" r="2" fill="#0BC0CF" />
        </svg>
        {{ $t({ en: 'Thinking', zh: '思考中' }) }}
      </div>
      <div v-if="round.state === RoundState.Cancelled" class="cancelled">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 4.5C7.85775 4.5 4.5 7.85775 4.5 12C4.5 16.1422 7.85775 19.5 12 19.5C16.1422 19.5 19.5 16.1422 19.5 12C19.5 7.85775 16.1422 4.5 12 4.5ZM11.4375 8.625C11.4375 8.3145 11.6895 8.0625 12 8.0625C12.3105 8.0625 12.5625 8.3145 12.5625 8.625V12.0533C12.5625 12.3638 12.3105 12.6158 12 12.6158C11.6895 12.6158 11.4375 12.3638 11.4375 12.0533V8.625ZM12.015 15.375C11.601 15.375 11.2612 15.039 11.2612 14.625C11.2612 14.211 11.5935 13.875 12.0075 13.875H12.015C12.4298 13.875 12.765 14.211 12.765 14.625C12.765 15.039 12.429 15.375 12.015 15.375Z"
            fill="currentColor"
          />
        </svg>
        {{ $t({ en: 'Cancelled', zh: '已取消' }) }}
      </div>
      <div v-if="round.state === RoundState.Failed" class="failed">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 4.5C7.86 4.5 4.5 7.86 4.5 12C4.5 16.14 7.86 19.5 12 19.5C16.14 19.5 19.5 16.14 19.5 12C19.5 7.86 16.14 4.5 12 4.5ZM14.6475 13.8525C14.865 14.07 14.865 14.43 14.6475 14.6475C14.535 14.76 14.3925 14.8125 14.25 14.8125C14.1075 14.8125 13.965 14.76 13.8525 14.6475L12 12.795L10.1475 14.6475C10.035 14.76 9.8925 14.8125 9.75 14.8125C9.6075 14.8125 9.465 14.76 9.3525 14.6475C9.135 14.43 9.135 14.07 9.3525 13.8525L11.205 12L9.3525 10.1475C9.135 9.93002 9.135 9.56998 9.3525 9.35248C9.57 9.13498 9.93 9.13498 10.1475 9.35248L12 11.205L13.8525 9.35248C14.07 9.13498 14.43 9.13498 14.6475 9.35248C14.865 9.56998 14.865 9.93002 14.6475 10.1475L12.795 12L14.6475 13.8525Z"
            fill="currentColor"
          />
        </svg>
        {{ $t(round.error!.userMessage) }}
      </div>
      <button v-if="retryable" class="retry" @click="emit('retry')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M7.44446 2.44446L9.11112 4.11112M9.11112 4.11112L7.44446 5.77779M9.11112 4.11112H5.11112C4.1777 4.11112 3.71099 4.11112 3.35447 4.29278C3.04087 4.45257 2.7859 4.70754 2.62611 5.02114C2.44446 5.37766 2.44446 5.84437 2.44446 6.77779V9.94446C2.44446 10.2025 2.44446 10.3315 2.45872 10.4398C2.55718 11.1877 3.14569 11.7762 3.89358 11.8746C4.00189 11.8889 4.13089 11.8889 4.3889 11.8889M6.8889 11.8889H10.8889C11.8223 11.8889 12.289 11.8889 12.6456 11.7072C12.9592 11.5475 13.2141 11.2925 13.3739 10.9789C13.5556 10.6224 13.5556 10.1557 13.5556 9.22224V6.05557C13.5556 5.79756 13.5556 5.66855 13.5413 5.56025C13.4428 4.81236 12.8543 4.22384 12.1064 4.12538C11.9981 4.11112 11.8691 4.11112 11.6111 4.11112M6.8889 11.8889L8.55557 13.5556M6.8889 11.8889L8.55557 10.2222"
            stroke="#57606A"
            stroke-width="1.33"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {{ $t({ en: 'Retry', zh: '重试' }) }}
      </button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.copilot-round + .copilot-round {
  border-top: 1px solid #e3e9ee;
}
.answer {
  padding: 20px 16px;
  align-self: stretch;
  border-top: 1px solid #e3e9ee;
}

.abnormal {
  padding: 0px 16px 20px;
  display: flex;
  align-self: stretch;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.loading,
.cancelled,
.failed {
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: stretch;

  font-size: 13px;
  line-height: 20px;
}

.loading-icon {
  circle {
    animation: circle-animation 1s linear infinite;
    &:nth-child(1) {
      animation-delay: 0s;
    }
    &:nth-child(2) {
      animation-delay: 0.33s;
    }
    &:nth-child(3) {
      animation-delay: 0.66s;
    }
  }

  @keyframes circle-animation {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }
}

.cancelled {
  color: var(--ui-color-yellow-main);
}

.failed {
  color: var(--ui-color-red-main);
}

.retry {
  margin-left: 32px;
  padding: 2px 0px;
  display: flex;
  align-items: center;
  gap: 4px;

  border: none;
  background: none;
  cursor: pointer;
  color: var(--ui-color-text);
  // TODO: hover?
}
</style>
