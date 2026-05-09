/**
 * @desc Client (& exception) definition for spx-backend APIs
 */

import * as Sentry from '@sentry/vue'
import dayjs from 'dayjs'
import { apiBaseUrl } from '@/utils/env'
import { TimeoutException } from '@/utils/exception/base'
import { mergeSignals } from '@/utils/disposable'
import { ApiException, ApiExceptionCode, type MovedResourceCanonical, type QuotaExceededMeta } from './exception'
import { parseSSE, type SSEEvent } from './sse'

/** Response body when exception encountered for API calling */
export type ApiExceptionPayload = {
  /** Code for program comsuming */
  code: number
  /** Message for developer reading */
  msg: string
  canonical?: MovedResourceCanonical
}

function isApiExceptionPayload(body: any): body is ApiExceptionPayload {
  return body && typeof body.code === 'number' && typeof body.msg === 'string'
}

function getQuotaExceededMeta(headers: Headers): QuotaExceededMeta {
  const retryAfter = headers.get('Retry-After')
  let date
  if (retryAfter != null) {
    const seconds = Number(retryAfter)
    date = Number.isFinite(seconds) ? dayjs().add(seconds, 's') : dayjs(retryAfter)
  }
  return {
    retryAfter: date?.isValid() ? date.valueOf() : null
  }
}

function getApiExceptionMeta(code: number, resp: Response, payload: ApiExceptionPayload): unknown {
  switch (code) {
    case ApiExceptionCode.errorQuotaExceeded:
      return getQuotaExceededMeta(resp.headers)
    case ApiExceptionCode.errorResourceMoved:
      return payload.canonical ?? null
    default:
      return null
  }
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

/** Event received from Server-Sent Events API, with `data` parsed as JSON */
export type JSONSSEEvent = {
  type: string
  data: unknown
}

export type ClientOptions = {
  baseUrl?: string
  fetchFn?: typeof fetch
}

export class Client {
  constructor(options: ClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? apiBaseUrl
    this.fetchFn = options.fetchFn ?? globalThis.fetch.bind(globalThis)
  }

  private tokenProvider: TokenProvider = async () => null
  setTokenProvider(provider: TokenProvider) {
    this.tokenProvider = provider
  }

  private baseUrl: string
  private fetchFn: typeof fetch
  private defaultTimeout = 10 * 1000 // 10 seconds

  /** Prepare request object, stringifying payload as JSON */
  private async prepareJSONRequest(path: string, payload: unknown, options?: RequestOptions): Promise<Request> {
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

  /** Perform request object and handle errors */
  private async doRequest(req: Request, options?: RequestOptions): Promise<Response> {
    const timeout = options?.timeout ?? this.defaultTimeout
    const timeoutCtrl = new AbortController()
    const timeoutTimer = setTimeout(() => timeoutCtrl.abort(new TimeoutException()), timeout)
    const signal = mergeSignals(options?.signal, timeoutCtrl.signal)
    const resp = await this.fetchFn(req, { signal }).finally(() => clearTimeout(timeoutTimer))
    if (!resp.ok) {
      let payload: ApiExceptionPayload | undefined
      try {
        const body = await resp.json()
        if (isApiExceptionPayload(body)) payload = body
      } catch {
        // ignore
      }
      if (payload == null) throw new Error(`status ${resp.status} for api call: ${req.url.slice(0, 200)}`)
      throw new ApiException(payload.code, payload.msg, {
        req,
        meta: getApiExceptionMeta(payload.code, resp, payload)
      })
    }
    return resp
  }

  /** Do a JSON request, parsing response body as JSON */
  private async requestJSON(path: string, payload: unknown, options?: RequestOptions): Promise<unknown> {
    const req = await this.prepareJSONRequest(path, payload, options)
    const resp = await this.doRequest(req, options)
    if (resp.status === 204) return null
    return resp.json()
  }

  private async requestBinary(path: string, payload: FormData, options?: RequestOptions) {
    const traceData = Sentry.getTraceData()
    const sentryTraceHeader = traceData['sentry-trace']
    const sentryBaggageHeader = traceData['baggage']
    const url = this.baseUrl + path
    const method = options?.method ?? 'GET'
    const token = await this.tokenProvider()
    options?.signal?.throwIfAborted()
    const headers = options?.headers ?? new Headers()
    if (token != null) headers.set('Authorization', `Bearer ${token}`)
    if (sentryTraceHeader != null) headers.set('Sentry-Trace', sentryTraceHeader)
    if (sentryBaggageHeader != null) headers.set('Baggage', sentryBaggageHeader)
    const req = new Request(url, { method, headers, body: payload })
    const resp = await this.doRequest(req, options)
    if (resp.status === 204) return null
    return resp.blob()
  }

  private async *requestTextStream(path: string, payload: unknown, options?: RequestOptions): AsyncGenerator<string> {
    const req = await this.prepareJSONRequest(path, payload, options)
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

  /** Request HTTP API with Server-Sent Events as response */
  private requestSSE(path: string, payload: unknown, options?: RequestOptions): AsyncGenerator<SSEEvent> {
    const stream = this.requestTextStream(path, payload, options)
    return parseSSE(stream)
  }

  /** Request HTTP API with Server-Sent Events as response, parsing event data as JSON */
  private async *requestJSONSSE(
    path: string,
    payload: unknown,
    options?: RequestOptions
  ): AsyncGenerator<JSONSSEEvent> {
    for await (const event of this.requestSSE(path, payload, options)) {
      const data = JSON.parse(event.data)
      yield { type: event.type, data }
    }
  }

  get(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    return this.requestJSON(path, null, { ...options, method: 'GET' })
  }

  post(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.requestJSON(path, payload, { ...options, method: 'POST' })
  }

  postBinary(path: string, payload: FormData, options?: Omit<RequestOptions, 'method'>) {
    return this.requestBinary(path, payload, { ...options, method: 'POST' })
  }

  patch(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.requestJSON(path, payload, { ...options, method: 'PATCH' })
  }

  delete(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    return this.requestJSON(path, null, { ...options, method: 'DELETE' })
  }

  postTextStream(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.requestTextStream(path, payload, { ...options, method: 'POST' })
  }

  getJSONSSE(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    return this.requestJSONSSE(path, null, { ...options, method: 'GET' })
  }

  postJSONSSE(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.requestJSONSSE(path, payload, { ...options, method: 'POST' })
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
