<script lang="ts" setup>
import { Round } from '../copilot'
import RetryableWrapper from './RetryableWrapper.vue'

defineProps<{
  round: Round
  isLastRound: boolean
}>()
</script>

<template>
  <RetryableWrapper class="cancelled" :round="round" :is-last-round="isLastRound">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 3.33334C6.31804 3.33334 3.33337 6.31801 3.33337 10C3.33337 13.682 6.31804 16.6667 10 16.6667C13.682 16.6667 16.6667 13.682 16.6667 10C16.6667 6.31801 13.682 3.33334 10 3.33334ZM9.50004 7.00001C9.50004 6.72401 9.72404 6.50001 10 6.50001C10.276 6.50001 10.5 6.72401 10.5 7.00001V10.0474C10.5 10.3234 10.276 10.5474 10 10.5474C9.72404 10.5474 9.50004 10.3234 9.50004 10.0474V7.00001ZM10.0134 13C9.64539 13 9.3433 12.7013 9.3433 12.3333C9.3433 11.9653 9.63871 11.6667 10.0067 11.6667H10.0134C10.3821 11.6667 10.6801 11.9653 10.6801 12.3333C10.6801 12.7013 10.3814 13 10.0134 13Z"
        fill="#FAA135"
      />
    </svg>
    {{ $t({ en: 'Cancelled', zh: '已取消' }) }}
  </RetryableWrapper>
</template>

<style lang="scss" scoped>
.cancelled {
  color: var(--ui-color-yellow-main);
}
</style>
