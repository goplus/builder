/**
 * @desc Definition for Exceptions & tools to help handle them
 */

import { useMessage } from 'naive-ui'
import { useI18n } from './i18n'
import type { LocaleMessage } from './i18n'

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
 * Cancelled is a special exception, it stands for a "cancel operation" because of user ineraction.
 * Like other exceptions, it breaks normal flows, while it is supposed to be ignored by all user-feedback components,
 * so the user will not be notified of cancelled exceptions.
 */
export class Cancelled extends Exception {
  name = 'Cancelled'
  userMessage = null
  constructor() {
    super('cancelled')
  }
}

const failedMessage = (summary: string, reason: string | null) => ({
  en: reason ? `${summary} (${reason})` : summary,
  zh: reason ? `${summary}（${reason}）` : summary
})

export function useMessageHandle<Args extends any[], Ret>(
  action: (...args: Args) => Promise<Ret>,
  failureSummaryMessage: LocaleMessage,
  successMessage?: LocaleMessage | ((ret: Ret) => LocaleMessage)
): (...args: Args) => Promise<Ret> {
  const m = useMessage()
  const { t } = useI18n()

  return (...args: Args) => {
    return action(...args).then(
      (ret) => {
        if (successMessage != null) {
          const successText = t(
            typeof successMessage === 'function' ? successMessage(ret) : successMessage
          )
          m.success(() => successText)
        }
        return ret
      },
      (e) => {
        if (!(e instanceof Cancelled)) {
          let reasonMessage: LocaleMessage | null = null
          if (e instanceof Exception && e.userMessage != null) {
            reasonMessage = e.userMessage
          }
          const result = t(failedMessage(t(failureSummaryMessage), t(reasonMessage)))
          m.error(() => result)
        }
        throw e
      }
    )
  }
}

// TODO: helpers for in-place feedback
// export function useAction<T>(action: () => Promise<T>): Result<T> {
//   return { value: null }
// }
