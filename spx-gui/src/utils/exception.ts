/**
 * @desc Definition for Exceptions & tools to help handle them
 */

import { useMessage } from 'naive-ui'
import { useI18n } from './i18n'
import type { LocaleMessage, FunctionLocaleMessage } from './i18n'

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
  constructor(public userMessage: LocaleMessage) {
    super(userMessage.en)
  }
}

const failedMessage: FunctionLocaleMessage<[summary: string, reason: string | null]> = {
  en: (summary, reason) => (reason ? `${summary} (${reason})` : summary),
  zh: (summary, reason) => (reason ? `${summary}（${reason}）` : summary)
}

export function useMessageHandle<F extends () => Promise<unknown>>(
  action: F,
  failureSummaryMessage: LocaleMessage,
  successMessage?: LocaleMessage
): F {
  const m = useMessage()
  const { t } = useI18n()

  return (() => {
    return action().then(
      (ret) => {
        if (successMessage != null) {
          m.success(() => t(successMessage))
        }
        return ret
      },
      (e) => {
        let reasonMessage: LocaleMessage | null = null
        if (e instanceof Exception && e.userMessage != null) {
          reasonMessage = e.userMessage
        }
        const result = t(failedMessage, t(failureSummaryMessage), t(reasonMessage))
        m.error(() => result)
        throw e
      }
    )
  }) as F
}

// TODO: helpers for in-place feedback
// export function useAction<T>(action: () => Promise<T>): Result<T> {
//   return { value: null }
// }
