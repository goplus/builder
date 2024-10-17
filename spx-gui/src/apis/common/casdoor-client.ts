import { casdoorConfig } from '@/utils/env'
import { CasdoorApiException } from './exception'
import { useRequest, withQueryParams, type RequestOptions, type QueryParams } from '.'

/** Response body when exception encountered for Casdoor API calling */
export type CasdoorApiExceptionPayload = {
  /** Message for developer reading */
  msg: string
}

function isCasdoorApiExceptionPayload(body: any): body is CasdoorApiExceptionPayload {
  return body && typeof body.msg === 'string'
}

export class CasdoorClient {
  private request = useRequest(casdoorConfig.serverUrl, async (resp) => {
    if (!resp.ok) {
      const body = await resp.json()
      if (!isCasdoorApiExceptionPayload(body)) {
        throw new Error('casdoor api call failed')
      }
      throw new CasdoorApiException(body.msg)
    }
    if (resp.status === 204) return null
    const body = await resp.json()
    return body.data
  })

  get(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    return this.request(path, null, { ...options, method: 'GET' })
  }
}
