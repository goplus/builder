/**
 * @desc Client (& exception) definition for spx-backend APIs
 */

import { apiBaseUrl } from '@/utils/env'
import { ApiException } from './exception'
import { useRequest, withQueryParams, type RequestOptions, type QueryParams } from '.'

/** Response body when exception encountered for API calling */
export type ApiExceptionPayload = {
  /** Code for program comsuming */
  code: number
  /** Message for developer reading */
  msg: string
}

function isApiExceptionPayload(body: any): body is ApiExceptionPayload {
  return body && typeof body.code === 'number' && typeof body.msg === 'string'
}

export class Client {
  private request = useRequest(apiBaseUrl, async (resp) => {
    if (!resp.ok) {
      const body = await resp.json()
      if (!isApiExceptionPayload(body)) {
        throw new Error('api call failed')
      }
      throw new ApiException(body.code, body.msg)
    }
    if (resp.status === 204) return null
    return resp.json()
  })

  get(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    return this.request(path, null, { ...options, method: 'GET' })
  }

  post(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.request(path, payload, { ...options, method: 'POST' })
  }

  put(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.request(path, payload, { ...options, method: 'PUT' })
  }

  delete(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    return this.request(path, null, { ...options, method: 'DELETE' })
  }

  async postStream(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    const response = await this.request(path, payload, { 
      ...options, 
      method: 'POST',
    }) as Response
    
    if (!response.ok) {
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (reader) {
        const { value } = await reader.read()
        const errorText = decoder.decode(value)
        try {
          const errorBody = JSON.parse(errorText)
          if (isApiExceptionPayload(errorBody)) {
            throw new ApiException(errorBody.code, errorBody.msg)
          }
        } catch {
          throw new Error('Stream request failed')
        }
      }
      throw new Error('Stream request failed')
    }
    
    return response
  }
}
