<script setup lang="ts">
import { ApiException, isQuotaExceededMeta } from '@/apis/common/exception'
import QuotaExceededCountdown from '@/components/common/QuotaExceededCountdown.vue'
import { UIError } from '@/components/ui'
import type { PhaseState } from '@/models/spx/gen/common'
import { computed } from 'vue'

export type PhaseStateFailed<R> = Extract<PhaseState<R>, { status: 'failed' }>

const props = defineProps<{
  stateFailed: PhaseStateFailed<unknown>
}>()

const quotaExceededMeta = computed(() => {
  const cause = props.stateFailed.error.cause
  if (cause instanceof ApiException && isQuotaExceededMeta(cause.code, cause.meta)) {
    return cause.meta
  }
  return null
})
</script>

<template>
  <UIError>
    <div>{{ $t(stateFailed.error.userMessage) }}</div>
    <template v-if="quotaExceededMeta != null" #sub-message>
      <QuotaExceededCountdown :quota-exceeded-meta="quotaExceededMeta" />
    </template>
  </UIError>
</template>
