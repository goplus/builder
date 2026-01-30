<script lang="ts">
const unitTypes = ['h', 'm', 's'] as const

// Callback interval per unit time, in milliseconds.
// Why are h and m half an hour and half a minute? To avoid precision issues.
// Update more frequently than the unit to ensure smooth transitions
// e.g., for hours, update every 30min; for minutes, update every 30s
const unitInterval = {
  h: (60 * 60 * 1000) / 2,
  m: (60 * 1000) / 2,
  s: 1000
} as const

function getLargestUnitType(start: dayjs.Dayjs, end: dayjs.Dayjs) {
  for (const unit of unitTypes) {
    if (end.diff(start, unit) > 0) {
      return unit
    }
  }
  return 's'
}
</script>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import dayjs from 'dayjs'

import type { LocaleMessage } from '@/utils/i18n'
import { spacingLocaleZhMessage, useInterval } from '@/utils/utils'
import { type QuotaExceededMeta } from '@/apis/common/exception'

const props = defineProps<{
  quotaExceededMeta: QuotaExceededMeta
}>()

const retryAfterTime = ref<LocaleMessage | null>(null)
const interval = ref<number | null>(null)

const updateRetryAfterTime = () => {
  const retryAfterMs = props.quotaExceededMeta.retryAfter
  const retryAfter = retryAfterMs != null ? dayjs(retryAfterMs) : null

  if (retryAfter == null || retryAfter.isBefore()) {
    interval.value = null
    retryAfterTime.value = null
    return
  }

  const unitType = getLargestUnitType(dayjs(), retryAfter)
  interval.value = unitInterval[unitType]
  retryAfterTime.value = {
    en: retryAfter.locale('en').fromNow(),
    zh: retryAfter.locale('zh').fromNow()
  }
}

useInterval(updateRetryAfterTime, interval)
onMounted(updateRetryAfterTime)
</script>

<template>
  {{
    retryAfterTime != null
      ? $t(spacingLocaleZhMessage({ en: `Please try again ${retryAfterTime.en}`, zh: `请${retryAfterTime.zh}尝试` }))
      : ''
  }}
</template>
