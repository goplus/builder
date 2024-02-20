/* eslint-disable @typescript-eslint/naming-convention */
import { useQuery, type UseQueryReturnType } from '@tanstack/vue-query'
import { useUserStore } from '@/store'
import { casdoorSdk, type CasdoorAccount } from './casdoor'
import { service } from '@/axios'

export const useProfile: () => UseQueryReturnType<CasdoorAccount | null, Error> = () =>
  useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const userStore = useUserStore()

      if (!userStore.hasLoggedIn()) {
        return null
      }
      const accessToken = await userStore.getFreshAccessToken()
      if (!accessToken) {
        return null
      }
      // TODO: Modify this
      const params = new URLSearchParams({
        access_token: accessToken
      })
      const url = `${casdoorSdk.config.serverUrl.trim()}/account`
      const response = await service.get<CasdoorAccount>(url)

      return response.data
    }
  })
