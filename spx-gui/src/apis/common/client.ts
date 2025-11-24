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

  // Request variant that returns binary (Blob). It shares the same token/sentry logic
  // from useRequest but maps successful responses to Blob.
  private requestBinary = useRequest<Blob>(apiBaseUrl, async (resp) => {
    if (!resp.ok) {
      // Try parse API exception payload if possible
      let body: any = null
      try {
        body = await resp.json()
      } catch (_) {
        // ignore parse error
      }
      if (!isApiExceptionPayload(body)) {
        throw new Error('api call failed')
      }
      throw new ApiException(body.code, body.msg)
    }
    if (resp.status === 204) return null as any
    return resp.blob()
  })

  private requestTextStream = useRequest(apiBaseUrl, async function* (resp): AsyncIterableIterator<string> {
    if (!resp.ok) {
      const body = await resp.json()
      if (!isApiExceptionPayload(body)) {
        throw new Error('api call failed')
      }
      throw new ApiException(body.code, body.msg)
    }

    const reader = resp.body?.getReader()
    if (!reader) throw new Error('Response body is null')

    try {
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        yield decoder.decode(value, { stream: true })
      }
    } finally {
      reader.releaseLock()
    }
  })

  async postTextStream(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.requestTextStream(path, payload, { ...options, method: 'POST' })
  }

  get(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    return this.request(path, null, { ...options, method: 'GET' })
  }

  post(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.request(path, payload, { ...options, method: 'POST' })
  }

  /**
   * POST and expect binary (Blob) response. payload can be FormData or JSON-able.
   */
  postBinary(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.requestBinary(path, payload, { ...options, method: 'POST' }) as Promise<Blob>
  }

  put(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.request(path, payload, { ...options, method: 'PUT' })
  }

  delete(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    return this.request(path, null, { ...options, method: 'DELETE' })
  }
}
