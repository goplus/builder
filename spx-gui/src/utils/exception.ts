/**
 * @desc Definition for Exceptions & tools to help handle them
 */

import { ref } from 'vue'
import { useI18n, type LocaleMessage } from './i18n'
import { useMessage } from '@/components/ui'

/**
 * Exceptions are like errors, while slightly different:
 * - They are expected to be thrown & caught, and they will be properly handled
 * - They are recognizable so they are easy to be programmatically handled
 * - They produce user-readable messages, while errors produce messages for developers
 */
export abstract class Exception extends Error {
  name = 'Exception'
  /**
   * Message expected to be displayed to user.
   * `userMessage: null` means it is not expected to be accessed by user.
   */
  abstract userMessage: LocaleMessage | null
}

export class DefaultException extends Exception {
  name = 'DefaultException'
  constructor(public userMessage: LocaleMessage) {
    super(userMessage.en)
  }
}

/**
 * Cancelled is a special exception, it stands for a "cancel operation" because of user interaction.
 * Like other exceptions, it breaks normal flows, while it is supposed to be ignored by all user-feedback components,
 * so the user will not be notified of cancelled exceptions.
 */
export class Cancelled extends Exception {
  name = 'Cancelled'
  userMessage = null
  constructor(public reason?: unknown) {
    super('cancelled')
  }
}

export class ActionException extends Exception {
  name = 'ActionException'
  userMessage: LocaleMessage

  constructor(
    public cause: unknown,
    summary: LocaleMessage
  ) {
    const reason = cause instanceof Exception ? cause.userMessage : null
    const userMessage = {
      en: reason ? `${summary.en} (${reason.en})` : summary.en,
      zh: reason ? `${summary.zh} (${reason.zh})` : summary.zh
    }
    super(`${userMessage.en}, cause: ${cause}`)
    this.userMessage = userMessage
  }
}

/** useAction transforms exceptions to ActionException instances, with proper messages */
export function useAction<Args extends any[], T>(
  fn: (...args: Args) => Promise<T>,
  failureSummaryMessage: LocaleMessage // TODO: the messages can be simplified if the messages' format is consistent
): (...args: Args) => Promise<T> {
  return async function actionFn(...args: Args) {
    try {
      return await fn(...args)
    } catch (e) {
      if (e instanceof Cancelled) throw e
      throw new ActionException(e, failureSummaryMessage)
    }
  }
}

/**
 * `useMessageHandle`
 * - transforms exceptions like `useAction`
 * - handles loading / success / failure with naive-ui message
 */
export function useMessageHandle<Args extends any[], T>(
  fn: (...args: Args) => Promise<T>,
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
    return fn(...args).then(
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
        // - `ActionException` exceptions: we will notify the user
        // do `return` (which swallows the exception) instead of `throw`.
        // It let the runtime (browser, vue, etc.) ignore such exceptions, which is intended.
        if (e instanceof Cancelled) return
        if (e instanceof ActionException) {
          m.error(t(e.userMessage))
          console.warn(e)
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
