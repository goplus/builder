<script lang="ts" setup>
import { UIIcon } from '@/components/ui'
import { Round } from '../copilot'
import RetryableWrapper from './RetryableWrapper.vue'

defineProps<{
  round: Round
  isLastRound: boolean
}>()
</script>

<template>
  <RetryableWrapper class="cancelled" :round="round" :is-last-round="isLastRound">
    <UIIcon type="warning" />
    {{ $t({ en: 'Cancelled', zh: '已取消' }) }}
  </RetryableWrapper>
</template>

<style lang="scss" scoped>
.cancelled {
  color: var(--ui-color-yellow-main);
}
</style>
