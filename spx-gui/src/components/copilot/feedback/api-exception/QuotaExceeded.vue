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
import { ref } from 'vue'
import { isNumber } from 'lodash'
import dayjs from 'dayjs'

import type { Round } from '@/components/copilot/copilot'
import type { LocaleMessage } from '@/utils/i18n'
import { useInterval } from '@/utils/utils'
import RetryableWrapper from '../RetryableWrapper.vue'
import { ApiExceptionCode, type ApiExceptionMetas } from '@/apis/common/exception'
import { UIIcon } from '@/components/ui'

const props = defineProps<{
  round: Round
  isLastRound: boolean
  exceptionMeta?: ApiExceptionMetas[ApiExceptionCode.errorQuotaExceeded]
}>()

const retryAfterTime = ref<LocaleMessage | null>(null)
const interval = ref<number | null>(1000)

useInterval(
  () => {
    if (!isNumber(props.exceptionMeta?.retryAfter)) {
      interval.value = null
      return
    }
    const retryAfter = dayjs(props.exceptionMeta.retryAfter)
    if (retryAfter.isBefore()) {
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
  },
  () => interval.value
)
</script>

<template>
  <RetryableWrapper class="quota-exceeded" :round="round" :is-last-round="isLastRound">
    <UIIcon type="warning" />
    {{
      $t({
        en: 'Quota exceeded.',
        zh: '配额已超限。'
      })
    }}
    <template v-if="retryAfterTime?.en != null">
      {{ $t({ en: `Please use again ${retryAfterTime.en}`, zh: `请${retryAfterTime.zh}再使用` }) }}
    </template>
  </RetryableWrapper>
</template>

<style lang="scss" scoped>
.quota-exceeded {
  color: var(--ui-color-yellow-main);
}
</style>
