/**
 * @desc Definition for Exceptions & tools to help handle them
 */

import { ref } from 'vue'
import { captureException } from '@sentry/vue'
import { useI18n, type LocaleMessage } from '../i18n'
import { useMessage } from '@/components/ui'
import { Exception, useAction, Cancelled } from './base'

export * from './base'

/**
 * `useMessageHandle`
 * - transforms exceptions like `useAction`
 * - handles loading / success / failure with naive-ui message
 */
export function useMessageHandle<Args extends any[], T>(
  fn: (...args: Args) => Promise<T> | T,
  failureSummaryMessage?: LocaleMessage,
  successMessage?: LocaleMessage | ((ret: T) => LocaleMessage)
) {
  const m = useMessage()
  const { t } = useI18n()
  if (failureSummaryMessage != null) {
    fn = useAction(fn, failureSummaryMessage)
  }
  const isLoading = ref(false)

  // Typically we should do message handling only in the very end of the action chain,
  // which means the returned (or resolved) value will not be used by subsequent code (cuz there is supposed to be no subsequent code).
  // So it's ok to resolve with `void` here, which allows us to swallow exceptions.
  function fnWithMessage(...args: Args): Promise<void> {
    isLoading.value = true
    return Promise.resolve(fn(...args)).then(
      (ret) => {
        isLoading.value = false
        if (successMessage != null) {
          const successText = t(typeof successMessage === 'function' ? successMessage(ret) : successMessage)
          m.success(successText)
        }
      },
      (e) => {
        isLoading.value = false
        // For
        // - `Cancelled` exceptions: nothing to do
        // - `Exception` exceptions with `userMessage`: we will notify the user with `userMessage`
        // do `return` (which swallows the exception) instead of `throw`.
        // It let the runtime (browser, vue, etc.) ignore such exceptions, which is intended.
        if (e instanceof Cancelled) return
        if (e instanceof Exception) {
          if (e.userMessage != null) m.error(t(e.userMessage))
          capture(e)
          return
        }
        throw e
      }
    )
  }
  return {
    fn: fnWithMessage,
    isLoading
  }
}

/**
 * `capture` is a utility function to capture exceptions.
 * It will ignore `Cancelled` exceptions, and log others to console and Sentry.
 * It is intended to be used in places where you handle exceptions but not throw them.
 * If you do `console.warn` or `console.error` somewhere, perhaps you should use `capture` instead.
 */
export function capture(err: unknown, ctx?: unknown) {
  if (err instanceof Cancelled) return
  if (process.env.NODE_ENV !== 'test') {
    captureException(err)
    console.warn(ctx, err)
  }
}
