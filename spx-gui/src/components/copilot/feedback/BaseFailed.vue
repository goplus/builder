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
  <RetryableWrapper class="text-red-main" :round="round" :is-last-round="isLastRound">
    <UIIcon type="errorTriangle" />
    {{ $t(round.error!) }}
  </RetryableWrapper>
</template>
