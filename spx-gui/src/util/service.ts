import { service } from '@/axios'
import { useUserStore } from '@/store'
export const initServive = async () => {
  const userStore = useUserStore()
  service.setAccessTokenFn(userStore.getFreshAccessToken)
}
