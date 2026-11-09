/**
 * @desc Basic definitions for exceptions. Extracted to avoid circular dependencies.
 */

import { type LocaleMessage } from '../i18n'

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

export class TimeoutException extends Exception {
  name = 'TimeoutException'
  userMessage = { en: 'operation timeout', zh: '操作超时' }
  constructor() {
    super('operation timeout')
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
  fn: (...args: Args) => Promise<T> | T,
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
