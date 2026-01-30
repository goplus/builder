import { ref } from 'vue'

export type EstimateOptions = {
  /** Estimated total time in seconds */
  estimatedTotal: number
  /** Update interval in seconds */
  updateInterval: number
  /** Minimum remaining time in seconds */
  minRemaining: number
}

/** `useEstimateRemainingTime` estimates the remaining time of a process. */
export function useEstimateRemainingTime(options: EstimateOptions) {
  const { estimatedTotal, updateInterval, minRemaining } = options
  const remaining = ref<number | null>(null)
  let _timer: ReturnType<typeof setInterval> | null = null

  const start = () => {
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

  return { remaining, start, stop }
}
