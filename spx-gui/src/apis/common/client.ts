/**
 * @desc Client (& exception) definition for spx-backend APIs
 */

import * as Sentry from '@sentry/vue'
import { apiBaseUrl } from '@/utils/env'
import { TimeoutException } from '@/utils/exception/base'
import { mergeSignals } from '@/utils/disposable'
import { ApiException } from './exception'

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

/** TokenProvider provides access token used for the Authorization header */
export type TokenProvider = () => Promise<string | null>

export type RequestOptions = {
  method: string
  headers?: Headers
  /**
   * Timeout duration in milliseconds, from request-sent to response-header-received, not including reading-response-body.
   * TODO: If we need a timeout for whole request-response roundtrip?
   */
  timeout?: number
  signal?: AbortSignal
}

export class Client {
  private tokenProvider: TokenProvider = async () => null
  setTokenProvider(provider: TokenProvider) {
    this.tokenProvider = provider
  }

  private baseUrl = apiBaseUrl
  private defaultTimeout = 10 * 1000 // 10 seconds

  private async prepareRequest(path: string, payload: unknown, options?: RequestOptions): Promise<Request> {
    const traceData = Sentry.getTraceData()
    const sentryTraceHeader = traceData['sentry-trace']
    const sentryBaggageHeader = traceData['baggage']
    const url = this.baseUrl + path
    const method = options?.method ?? 'GET'
    const body = payload != null ? JSON.stringify(payload) : null
    const token = await this.tokenProvider()
    options?.signal?.throwIfAborted()
    const headers = options?.headers ?? new Headers()
    if (body != null) headers.set('Content-Type', 'application/json')
    if (token != null) headers.set('Authorization', `Bearer ${token}`)
    if (sentryTraceHeader != null) headers.set('Sentry-Trace', sentryTraceHeader)
    if (sentryBaggageHeader != null) headers.set('Baggage', sentryBaggageHeader)
    return new Request(url, { method, headers, body })
  }

  private async doRequest(req: Request, options?: RequestOptions): Promise<Response> {
    const timeout = options?.timeout ?? this.defaultTimeout
    const timeoutCtrl = new AbortController()
    const timeoutTimer = setTimeout(() => timeoutCtrl.abort(new TimeoutException()), timeout)
    const signal = mergeSignals(options?.signal, timeoutCtrl.signal)
    const resp = await fetch(req, { signal }).finally(() => clearTimeout(timeoutTimer))
    if (!resp.ok) {
      let payload: ApiExceptionPayload | undefined
      try {
        const body = await resp.json()
        if (isApiExceptionPayload(body)) payload = body
      } catch {
        // ignore
      }
      if (payload == null) throw new Error(`status ${resp.status} for api call: ${req.url.slice(0, 200)}`)
      throw new ApiException(payload.code, payload.msg, { req, resp })
    }
    return resp
  }

  private async requestJSON(path: string, payload: unknown, options?: RequestOptions) {
    const req = await this.prepareRequest(path, payload, options)
    const resp = await this.doRequest(req, options)
    if (resp.status === 204) return null
    return resp.json()
  }

  private async *requestTextStream(
    path: string,
    payload: unknown,
    options?: RequestOptions
  ): AsyncIterableIterator<string> {
    const req = await this.prepareRequest(path, payload, options)
    const resp = await this.doRequest(req, options)
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
  }

  async postTextStream(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.requestTextStream(path, payload, { ...options, method: 'POST' })
  }

  get(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    return this.requestJSON(path, null, { ...options, method: 'GET' })
  }

  post(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.requestJSON(path, payload, { ...options, method: 'POST' })
  }

  put(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.requestJSON(path, payload, { ...options, method: 'PUT' })
  }

  delete(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    return this.requestJSON(path, null, { ...options, method: 'DELETE' })
  }
}

export type QueryParams = {
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
