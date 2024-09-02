/**
 * @desc Client (& exception) definition for spx-backend APIs
 */

import { apiBaseUrl } from '@/utils/env'
import { Exception } from '@/utils/exception'
import { ApiException } from './exception'

export type RequestOptions = {
  method: string
  headers?: Headers
  /** Timeout duration in milisecond, from request-sent to server-response-got */
  timeout?: number
  signal?: AbortSignal
}

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

/** AuthProvider provide value for header Authorization */
export type AuthProvider = () => Promise<string | null>

// milisecond
const defaultTimeout = 10 * 1000

class TimeoutException extends Exception {
  name = 'TimeoutException'
  userMessage = { en: 'request timeout', zh: '请求超时' }
  constructor() {
    super('request timeout')
  }
}

export class Client {
  private getAuth: AuthProvider = async () => null

  setAuthProvider(provider: AuthProvider) {
    this.getAuth = provider
  }

  private async prepareRequest(url: string, payload: unknown, options?: RequestOptions) {
    url = apiBaseUrl + url
    const method = options?.method ?? 'GET'
    const body = payload != null ? JSON.stringify(payload) : null
    const authorization = await this.getAuth()
    const headers = options?.headers ?? new Headers()
    headers.set('Content-Type', 'application/json')
    if (authorization != null) {
      headers.set('Authorization', authorization)
    }
    return new Request(url, { method, headers, body })
  }

  private async handleResponse(resp: Response): Promise<unknown> {
    if (!resp.ok) {
      const body = await resp.json()
      if (!isApiExceptionPayload(body)) {
        throw new Error('api call failed')
      }
      throw new ApiException(body.code, body.msg)
    }
    return resp.json()
  }

  private async request(url: string, payload: unknown, options?: RequestOptions) {
    const req = await this.prepareRequest(url, payload, options)
    const timeout = options?.timeout ?? defaultTimeout
    const ctrl = new AbortController()
    if (options?.signal != null) {
      // TODO: Reimplement this using `AbortSignal.any()` once it is widely supported.
      options.signal.throwIfAborted()
      options.signal.addEventListener('abort', () => ctrl.abort(options.signal?.reason))
    }
    const resp = await Promise.race([
      fetch(req, { signal: ctrl.signal }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new TimeoutException()), timeout))
    ]).catch((e) => {
      if (e instanceof TimeoutException) ctrl.abort()
      throw e
    })
    return this.handleResponse(resp)
  }

  get(url: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    url = params == null ? url : withQueryParams(url, params)
    return this.request(url, null, { ...options, method: 'GET' })
  }

  post(url: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.request(url, payload, { ...options, method: 'POST' })
  }

  put(url: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.request(url, payload, { ...options, method: 'PUT' })
  }

  delete(url: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    url = params == null ? url : withQueryParams(url, params)
    return this.request(url, null, { ...options, method: 'DELETE' })
  }
}

type QueryParams = {
  [k: string]: unknown
}

function withQueryParams(url: string, params: QueryParams) {
  const usp = new URLSearchParams()
  Object.keys(params).forEach((k) => {
    const v = params[k]
    if (v != null) usp.append(k, v + '')
  })
  const querystring = usp.toString()
  if (querystring !== '') {
    const sep = url.includes('?') ? '&' : '?'
    url = url + sep + querystring
  }
  return url
}
