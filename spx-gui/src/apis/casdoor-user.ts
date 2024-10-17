import { casdoorClient } from './common'
import { casdoorConfig } from '@/utils/env'

export type CasdoorUser = {
  id: string
  name: string
  displayName: string
  avatar: string
}

export async function getCasdoorUser(name: string): Promise<CasdoorUser> {
  return casdoorClient.get('/api/get-user', {
    id: `${casdoorConfig.organizationName}/${name}`
  }) as Promise<CasdoorUser>
}
