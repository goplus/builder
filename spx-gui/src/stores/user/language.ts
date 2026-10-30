import { watch } from 'vue'
import { useAction } from '@/utils/exception'
import { useI18n, type Lang } from '@/utils/i18n'
import { useQueryCache } from '@/utils/query'
import { updateSignedInUser } from '@/apis/user'
import { getUnresolvedSignedInUsername, useSignedInUser } from './signed-in'
import { getUserQueryKey } from './query-keys'

/** Restore the account preference when the signed-in user changes. */
export function useSyncUserLanguage() {
  const i18n = useI18n()
  const user = useSignedInUser()
  watch(
    () => user.value?.id,
    () => {
      // Profile refetches must not undo a language the user has just selected.
      if (user.value != null) i18n.setLang(user.value.preferredLanguage)
    },
    { immediate: true }
  )
}

export function useSetPreferredLanguage() {
  const i18n = useI18n()
  const queryCache = useQueryCache()
  return useAction(
    async (preferredLanguage: Lang) => {
      const usernameInput = getUnresolvedSignedInUsername()
      i18n.setLang(preferredLanguage)
      const updated = await updateSignedInUser({ preferredLanguage })
      if (usernameInput != null) queryCache.invalidate(getUserQueryKey(usernameInput))
      queryCache.invalidate(getUserQueryKey(updated.username))
    },
    {
      en: 'Language changed, but could not be saved to your account',
      zh: '语言已切换，但未能保存到账号'
    }
  )
}
