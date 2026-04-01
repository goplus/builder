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
  <RetryableWrapper class="text-yellow-main" :round="round" :is-last-round="isLastRound">
    <UIIcon type="warning" />
    {{ $t({ en: 'Cancelled', zh: '已取消' }) }}
  </RetryableWrapper>
</template>
