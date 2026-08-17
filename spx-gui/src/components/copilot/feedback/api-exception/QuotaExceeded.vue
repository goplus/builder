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

import type { Round } from '@/components/copilot/copilot'
import type { LocaleMessage } from '@/utils/i18n'
import { spacingLocaleZhMessage, useInterval } from '@/utils/utils'
import RetryableWrapper from '../RetryableWrapper.vue'
import { isQuotaExceededMeta } from '@/apis/common/exception'
import { UIButton, UIIcon } from '@/components/ui'

// TODO: Consider using the `QuotaExceededCountdown` component directly in the future
const props = withDefaults(
  defineProps<{
    round: Round
    isLastRound: boolean
    feedbackMode?: 'default' | 'guidance' | 'action'
  }>(),
  {
    feedbackMode: 'default'
  }
)
const emit = defineEmits<{
  feedback: []
}>()

const retryAfterTime = ref<LocaleMessage | null>(null)
const interval = ref<number | null>(null)

const updateRetryAfterTime = () => {
  const apiExceptionCode = props.round.apiExceptionCode
  const apiExceptionMeta = props.round.apiExceptionMeta
  if (
    apiExceptionCode == null ||
    !isQuotaExceededMeta(apiExceptionCode, apiExceptionMeta) ||
    apiExceptionMeta.retryAfter == null
  ) {
    interval.value = null
    retryAfterTime.value = null
    return
  }
  const retryAfter = dayjs(apiExceptionMeta.retryAfter)
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
}

useInterval(updateRetryAfterTime, interval)
onMounted(updateRetryAfterTime)
</script>

<template>
  <RetryableWrapper class="text-yellow-main" :round="round" :is-last-round="isLastRound">
    <UIIcon aria-hidden="true" class="mt-0.5 shrink-0 self-start" type="warning" />
    <span class="min-w-0 leading-5">
      <span>
        {{
          $t({
            en: 'Quota exceeded.',
            zh: '配额已超限。'
          })
        }}
        <template v-if="retryAfterTime != null">
          {{
            $t(
              spacingLocaleZhMessage({ en: `Please try again ${retryAfterTime.en}`, zh: `请${retryAfterTime.zh}尝试` })
            )
          }}
        </template>
      </span>
      <span v-if="feedbackMode === 'guidance'" class="mt-1 block text-grey-800">
        {{
          $t({
            en: 'To send feedback, choose “Send feedback” from the profile menu in the top-right corner.',
            zh: '如需反馈，请在右上角头像菜单中选择“提交反馈”。'
          })
        }}
      </span>
    </span>
    <template #actions>
      <UIButton
        v-if="feedbackMode === 'action'"
        v-radar="{ name: 'Send feedback', desc: 'Open the feedback form' }"
        data-test-id="quota-feedback"
        class="text-xs/[18px]"
        type="neutral"
        size="small"
        @click="emit('feedback')"
      >
        {{ $t({ en: 'Send feedback', zh: '提交反馈' }) }}
      </UIButton>
    </template>
  </RetryableWrapper>
</template>
