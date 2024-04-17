/**
 * @desc Definition for Exceptions & tools to help handle them
 */

import { useMessage } from '@/components/ui'
import { useI18n } from './i18n'
import type { LocaleMessage } from './i18n'
import { ref, shallowRef, watchEffect, type Ref, type ShallowRef } from 'vue'

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

export type ActionRet<Args extends any[], T> = {
  fn: (...args: Args) => Promise<T>
  isLoading: Ref<boolean>
}

/** useAction transforms exceptions to ActionException instances, with proper messages */
export function useAction<Args extends any[], T>(
  fn: (...args: Args) => Promise<T>,
  failureSummaryMessage: LocaleMessage
): ActionRet<Args, T> {
  const isLoading = ref(false)
  async function actionFn(...args: Args) {
    isLoading.value = true
    try {
      return await fn(...args)
    } catch (e) {
      if (e instanceof Cancelled) throw e
      throw new ActionException(e, failureSummaryMessage)
    } finally {
      isLoading.value = false
    }
  }
  return { fn: actionFn, isLoading }
}

/**
 * `useMessageHandle`
 * - transforms exceptions like `useAction`
 * - handles loading / success / failure with naive-ui message
 */
export function useMessageHandle<Args extends any[], T>(
  fn: (...args: Args) => Promise<T>,
  failureSummaryMessage: LocaleMessage, // TODO: the messages can be simplified if the messages' format is consistent
  successMessage?: LocaleMessage | ((ret: T) => LocaleMessage)
) {
  const m = useMessage()
  const { t } = useI18n()
  const action = useAction(fn, failureSummaryMessage)

  function messageHandleFn(...args: Args) {
    return action.fn(...args).then(
      (ret) => {
        if (successMessage != null) {
          const successText = t(
            typeof successMessage === 'function' ? successMessage(ret) : successMessage
          )
          m.success(successText)
        }
        return ret
      },
      (e) => {
        if (e instanceof ActionException) m.error(t(e.userMessage))
        throw e
      }
    )
  }
  return {
    fn: messageHandleFn,
    isLoading: action.isLoading
  }
}

export type QueryRet<T> = {
  isLoading: Ref<boolean>
  data: ShallowRef<T | null>
  error: ShallowRef<ActionException | null>
  refetch: () => void
}

/**
 * `useQuery`
 * - do query automatically
 * - transforms exceptions like `useAction`
 * - manage states for query result
 *
 * TODO: if things get more complex, we may need tools like `@tanstack/vue-query`
 */
export function useQuery<T>(
  fn: () => Promise<T>,
  failureSummaryMessage: LocaleMessage
): QueryRet<T> {
  const action = useAction(fn, failureSummaryMessage)
  const data = shallowRef<T | null>(null)
  const error = shallowRef<ActionException | null>(null)

  function fetch() {
    action.fn().then(
      (d) => {
        data.value = d
        error.value = null
      },
      (e) => {
        error.value = e
      }
    )
  }

  watchEffect(fetch)

  return { isLoading: action.isLoading, data, error, refetch: fetch }
}
