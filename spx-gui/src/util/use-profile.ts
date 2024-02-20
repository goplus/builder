/* eslint-disable @typescript-eslint/naming-convention */
import { useQuery, type UseQueryReturnType } from '@tanstack/vue-query'
import { useUserStore } from '@/store'
import { casdoorSdk, type CasdoorAccount } from './casdoor'
import { service } from '@/axios'

/**
 * Custom hook for fetching user profile data.
 * @returns An object containing the user profile data or null if the user is not signed in.
 */
export const useProfile: () => UseQueryReturnType<CasdoorAccount | null, Error> = () =>
  useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const userStore = useUserStore()

      if (!userStore.hasSignedIn()) {
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
