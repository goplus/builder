import { normalizeSafeReturnTo } from '@/stores/user/sign-in-entry'

export function getCallbackReturnTo(search: string) {
  const params = new URLSearchParams(search)
  return normalizeSafeReturnTo(params.get('returnTo'))
}
