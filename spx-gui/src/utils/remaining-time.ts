import { onBeforeUnmount, ref, watch } from 'vue'
import type { PhaseState } from '@/models/gen/common.ts'
import type { LocaleMessage } from '@/utils/i18n'
import dayjs from 'dayjs'

export type EstimateOptions = {
  /** Estimated total time in seconds */
  estimatedTotal: number
  /** Update interval in seconds */
  updateInterval: number
  /** Minimum remaining time in seconds */
  minRemaining: number
}

/** `useEstimateRemainingTime` estimates the remaining time of a process. */
export function useEstimateRemainingTime() {
  const remaining = ref<number | null>(null)
  let _timer: ReturnType<typeof setInterval> | null = null

  const start = (options: EstimateOptions) => {
    const { estimatedTotal, updateInterval, minRemaining } = options
    remaining.value = estimatedTotal
    const startedAt = Date.now()

    if (_timer) clearInterval(_timer)
    _timer = setInterval(() => {
      if (remaining.value === null) return
      const elapsed = (Date.now() - startedAt) / 1000
      remaining.value = Math.round(Math.max(minRemaining, estimatedTotal - elapsed))
    }, updateInterval * 1000)
  }

  const stop = () => {
    if (_timer) {
      clearInterval(_timer)
      _timer = null
    }
    remaining.value = null
  }

  // Auto-cleanup on unmount
  onBeforeUnmount(() => {
    stop()
  })

  return { remaining, start, stop }
}

export function useRemainingTimeForPhase(stateGetter: () => PhaseState<unknown>, config: EstimateOptions) {
  const { remaining, start, stop } = useEstimateRemainingTime()

  watch(
    () => stateGetter().status,
    () => {
      const state = stateGetter()
      if (state.status === 'running') {
        const elapsed = (Date.now() - state.startAt) / 1000
        const estimatedTotal = Math.round(Math.max(config.minRemaining, config.estimatedTotal - elapsed))
        start({ estimatedTotal, updateInterval: config.updateInterval, minRemaining: config.minRemaining })
      } else {
        stop()
      }
    },
    { immediate: true }
  )

  return { remaining }
}

export function humanizeRemaining(seconds: number): LocaleMessage {
  const t = dayjs().add(seconds, 'second')
  // TODO: the parentheses should not be hardcoded here
  return {
    en: `(ETA: ${t.locale('en').fromNow()})`,
    zh: `（预计完成时间：${t.locale('zh').fromNow()}）`
  }
}
