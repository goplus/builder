<script lang="ts" setup>
import { computed } from 'vue'

import { Round, RoundState } from '../copilot'

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
</script>

<template>
  <div class="retryable-wrapper">
    <slot />
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

<style lang="scss" scoped>
.retryable-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: stretch;

  line-height: 20px;
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
