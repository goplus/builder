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

type HandleMessageOptions<T> = {
  successMessage?: LocaleMessage | ((ret: T) => LocaleMessage),
  onSuccess?: (result: T) => void,
  onFail?: (error: ActionException) => void
};
  // Typically we should do message handling only in the very end of the action chain,
  // which means the returned (or resolved) value will not be used by subsequent code (cuz there is supposed to be no subsequent code).
  // So it's ok to resolve with `void` here, which allows us to swallow exceptions.
async function handleMessage<T>(
  action: () => Promise<T>,
  options: HandleMessageOptions<T>,
  t: (msg: LocaleMessage) => string,
  m: { success: (msg: string) => void, error: (msg: string) => void }
): Promise<void> {
  try {
    const result = await action();

    if (options.onSuccess) {
      options.onSuccess(result);
    }

    if (options.successMessage) {
      const successText = t(
        typeof options.successMessage === 'function' ? options.successMessage(result) : options.successMessage
      );
      m.success(successText);
    }
  } catch (e) {
    // For
    // - `Cancelled` exceptions: nothing to do
    // - `ActionException` exceptions: we will notify the user
    // do `return` (which swallows the exception) instead of `throw`.
    // It let the runtime (browser, vue, etc.) ignore such exceptions, which is intended.
    if (e instanceof Cancelled) return;

    if (e instanceof ActionException) {
      if (options.onFail) {
        options.onFail(e);
      }

      m.error(t(e.userMessage));
      console.warn(e);
      return;
    }

    throw e; 
  }
}


/**
 * `useMessageHandle`
 * - transforms exceptions like `useAction`
 * - handles loading / success / failure with naive-ui message
 */
export function useMessageHandle<Args extends any[], T>(
  fn: (...args: Args) => Promise<T>,
  failureSummaryMessage: LocaleMessage,
  successMessage?: LocaleMessage | ((ret: T) => LocaleMessage)
) {
  const m = useMessage();
  const { t } = useI18n();
  const action = useAction(fn, failureSummaryMessage);

  function messageHandleFn(...args: Args): Promise<void> {
    return handleMessage(
      () => action.fn(...args),
      { successMessage },
      t,
      m
    );
  }
  return {
    fn: messageHandleFn,
    isLoading: action.isLoading
  };
}

/**
 * `useEnhancedMessageHandle` is an enhanced version of `useMessageHandle`,allowing handling of success and failure
 * @param fn function to handle
 * @param failureSummaryMessage 
 * @param successMessage 
 * @param onSuccess function to handle success
 * @param onFail function to handle failure
 * @returns 
 */
export function useEnhancedMessageHandle<Args extends any[], T>(
  fn: (...args: Args) => Promise<T>,
  failureSummaryMessage: LocaleMessage,
  successMessage?: LocaleMessage | ((ret: T) => LocaleMessage),
  onSuccess?: (result: T) => void,
  onFail?: (error: ActionException) => void
) {
  const m = useMessage();
  const { t } = useI18n();
  const action = useAction(fn, failureSummaryMessage);

  function enhancedMessageHandleFn(...args: Args): Promise<void> {
    return handleMessage(
      () => action.fn(...args),
      { successMessage, onSuccess, onFail },
      t,
      m
    );
  }

  return {
    fn: enhancedMessageHandleFn,
    isLoading: action.isLoading
  };
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
 * - set `preventRaceCondition` to `true` to drop outdated results
 *
 * TODO: if things get more complex, we may need tools like `@tanstack/vue-query`
 */
export function useQuery<T>(
  fn: () => Promise<T>,
  failureSummaryMessage: LocaleMessage,
  preventRaceCondition = false
): QueryRet<T> {
  const action = useAction(fn, failureSummaryMessage)
  const data = shallowRef<T | null>(null)
  const error = shallowRef<ActionException | null>(null)
  let currentRequestId = 0

  function fetch() {
    const requestId = ++currentRequestId
    action.fn().then(
      (d) => {
        // Only update the data if the requestId is the latest one
        if (preventRaceCondition && requestId !== currentRequestId) {
          return
        }
        data.value = d
        error.value = null
      },
      (e) => {
        if (preventRaceCondition && requestId !== currentRequestId) {
          return
        }
        error.value = e
        console.warn(e)
      }
    )
  }

  watchEffect(fetch)

  return { isLoading: action.isLoading, data, error, refetch: fetch }
}
/**
 * `useRetryMessageHandle` allowing retrying a failed action,not throw message when cancelled
 */
export function useRetryHandle<Args extends any[], T>(
  fn: (...args: Args) => Promise<T>,
  retries = 10, 
  retryDelay = 4000 
): { fn: (...args: Args) => Promise<T>, isLoading: Ref<boolean> } {
  const isLoading = ref(false);

  async function retryingMessageHandleFn(...args: Args): Promise<T> {
    isLoading.value = true;
    let attempts = 0;

    while (attempts < retries) {
      try {
        const result = await fn(...args);
        isLoading.value = false;
        return result;
      } catch (e) {
        attempts++;
        if (attempts >= retries || e instanceof Cancelled) {
          isLoading.value = false;
          throw e;
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error('Exceeded maximum retry attempts');
  }

  return {
    fn: retryingMessageHandleFn,
    isLoading,
  };
}


