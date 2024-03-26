/**
 * @desc Tools to handle errors
 */

import { useI18n } from 'vue-i18n'
import { useMessage } from 'naive-ui'
import { ApiError, getI18nKey } from '@/api/common/error'

export function handle() {}

// function humanize(e: unknown) {
//   if (e instanceof ApiError) return [e.code]
// }

export async function useMessageHandle<T>(actionName, action: () => Promise<T>): Promise<T> {
  const message = useMessage()
  const { t } = useI18n({
    inheritLocale: true, // TODO: these 2 options really required?
    useScope: 'global'
  })
  try {
    return await action()
  } catch (e) {
    if (e instanceof ApiError) {
      message.error(t(getI18nKey(e)))
    }
    throw e
  }
}

export function useRefHandle() {}
