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
import { useCopilot } from '@/components/copilot/CopilotRoot.vue'
import type { LocaleMessage } from '@/utils/i18n'
import { useInterval } from '@/utils/utils'

const props = defineProps<{
  round: Round
}>()

const copilot = useCopilot()

const retryAfterTime = ref<LocaleMessage | null>(null)
const interval = ref(1000)

const { pause } = useInterval(
  () => {
    const { updatedAt, apiExceptionMeta } = props.round
    if (!isNumber(apiExceptionMeta?.retryAfter)) {
      pause()
      return
    }
    const retryAfter = dayjs(updatedAt).add(apiExceptionMeta.retryAfter, 's')
    const unitType = getLargestUnitType(dayjs(), retryAfter)
    interval.value = unitInterval[unitType]
    retryAfterTime.value = {
      en: retryAfter.locale('en').fromNow(),
      zh: retryAfter.locale('zh').fromNow()
    }
    const dueSeconds = retryAfter.diff(dayjs(), 's')
    if (dueSeconds <= 0) {
      pause()
      copilot.endCurrentSession()
    }
  },
  { interval }
)
</script>

<template>
  <div class="quota-exceeded">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 3.33334C6.31804 3.33334 3.33337 6.31801 3.33337 10C3.33337 13.682 6.31804 16.6667 10 16.6667C13.682 16.6667 16.6667 13.682 16.6667 10C16.6667 6.31801 13.682 3.33334 10 3.33334ZM9.50004 7.00001C9.50004 6.72401 9.72404 6.50001 10 6.50001C10.276 6.50001 10.5 6.72401 10.5 7.00001V10.0474C10.5 10.3234 10.276 10.5474 10 10.5474C9.72404 10.5474 9.50004 10.3234 9.50004 10.0474V7.00001ZM10.0134 13C9.64539 13 9.3433 12.7013 9.3433 12.3333C9.3433 11.9653 9.63871 11.6667 10.0067 11.6667H10.0134C10.3821 11.6667 10.6801 11.9653 10.6801 12.3333C10.6801 12.7013 10.3814 13 10.0134 13Z"
        fill="#FAA135"
      />
    </svg>
    <div class="message">
      {{
        $t({
          en: 'Quota exceeded.',
          zh: '配额已超限。'
        })
      }}
      <template v-if="retryAfterTime?.en != null">
        {{ $t({ en: `Please try again ${retryAfterTime.en}`, zh: `请${retryAfterTime.zh}重试` }) }}
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.quota-exceeded {
  font-size: 13px;
  line-height: 1.7;

  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
