<script lang="ts" setup>
import { Round } from '../copilot'
import RetryableWrapper from './RetryableWrapper.vue'

defineProps<{
  round: Round
  isLastRound: boolean
}>()
</script>

<template>
  <RetryableWrapper class="failed" :round="round" :is-last-round="isLastRound">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.99998 3.33331C6.31998 3.33331 3.33331 6.31998 3.33331 9.99998C3.33331 13.68 6.31998 16.6666 9.99998 16.6666C13.68 16.6666 16.6666 13.68 16.6666 9.99998C16.6666 6.31998 13.68 3.33331 9.99998 3.33331ZM12.3533 11.6466C12.5466 11.84 12.5466 12.16 12.3533 12.3533C12.2533 12.4533 12.1266 12.5 12 12.5C11.8733 12.5 11.7466 12.4533 11.6466 12.3533L9.99998 10.7066L8.35331 12.3533C8.25331 12.4533 8.12665 12.5 7.99998 12.5C7.87331 12.5 7.74665 12.4533 7.64665 12.3533C7.45331 12.16 7.45331 11.84 7.64665 11.6466L9.29331 9.99998L7.64665 8.35333C7.45331 8.16 7.45331 7.83996 7.64665 7.64663C7.83998 7.45329 8.15998 7.45329 8.35331 7.64663L9.99998 9.29331L11.6466 7.64663C11.84 7.45329 12.16 7.45329 12.3533 7.64663C12.5466 7.83996 12.5466 8.16 12.3533 8.35333L10.7066 9.99998L12.3533 11.6466Z"
        fill="#EF4149"
      />
    </svg>
    {{ $t(round.error!) }}
  </RetryableWrapper>
</template>

<style lang="scss" scoped>
.failed {
  color: var(--ui-color-red-main);
}
</style>
