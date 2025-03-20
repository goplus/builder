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

  private addDefaultHeaders(headers?: Headers): Headers {
    const finalHeaders = headers ?? new Headers()
    // 添加 ngrok-skip-browser-warning 头部
    finalHeaders.set('ngrok-skip-browser-warning', '1')
    return finalHeaders
  }

  get(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    // return this.request(path, null, { ...options, method: 'GET' })
    const headers = this.addDefaultHeaders(options?.headers)
    return this.request(path, null, { ...options, headers, method: 'GET' })
  }

  post(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    // return this.request(path, payload, { ...options, method: 'POST' })
    const headers = this.addDefaultHeaders(options?.headers)
    return this.request(path, payload, { ...options, headers, method: 'POST' })
  }

  put(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    // return this.request(path, payload, { ...options, method: 'PUT' })
    const headers = this.addDefaultHeaders(options?.headers)
    return this.request(path, payload, { ...options, headers, method: 'PUT' })
  }

  delete(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    // return this.request(path, null, { ...options, method: 'DELETE' })
    const headers = this.addDefaultHeaders(options?.headers)
    return this.request(path, null, { ...options, headers, method: 'DELETE' })
  }
}
