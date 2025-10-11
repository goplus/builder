import { mergeSignals } from '@/utils/disposable'
import { Exception } from '@/utils/exception'
import { Client } from './client'

/** TokenProvider provides access token used for the Authorization header */
export type TokenProvider = () => Promise<string | null>

let tokenProvider: TokenProvider = async () => null
export function setTokenProvider(provider: TokenProvider) {
  tokenProvider = provider
}

/** ResponseHandler is used to handle the response from the server. */
export type ResponseHandler<T> = (resp: Response) => T | Promise<T>

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

class TimeoutException extends Exception {
  name = 'TimeoutException'
  userMessage = { en: 'request timeout', zh: '请求超时' }
  constructor() {
    super('request timeout')
  }
}

export function useRequest<T>(
  baseUrl: string = '',
  responseHandler: ResponseHandler<T>,
  defaultTimeout: number = 10 * 1000 // 10 seconds
) {
  async function prepareRequest(path: string, payload: unknown, options?: RequestOptions) {
    const url = baseUrl + path
    const method = options?.method ?? 'GET'
    const body = payload != null ? JSON.stringify(payload) : null
    const token = await tokenProvider()
    const headers = options?.headers ?? new Headers()
    headers.set('Content-Type', 'application/json')
    if (token != null) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return new Request(url, { method, headers, body })
  }

  return async function request(path: string, payload: unknown, options?: RequestOptions) {
    const req = await prepareRequest(path, payload, options)
    options?.signal?.throwIfAborted()
    const timeout = options?.timeout ?? defaultTimeout
    const timeoutCtrl = new AbortController()
    const timeoutTimer = setTimeout(() => timeoutCtrl.abort(new TimeoutException()), timeout)
    const signal = mergeSignals(options?.signal, timeoutCtrl.signal)
    const resp = await fetch(req, { signal }).finally(() => clearTimeout(timeoutTimer))
    return responseHandler(resp)
  }
}

export function useFormDataRequest<T>(
  baseUrl: string = '',
  responseHandler: ResponseHandler<T>,
  defaultTimeout: number = 10 * 1000 // 10 seconds
) {
  async function prepareRequest(path: string, formData: FormData, options?: RequestOptions) {
    const url = baseUrl + path
    const method = options?.method ?? 'POST'
    const token = await tokenProvider()
    const headers = options?.headers ?? new Headers()
    if (token != null) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return new Request(url, { method, headers, body: formData })
  }

  return async function request(path: string, formData: FormData, options?: RequestOptions) {
    const req = await prepareRequest(path, formData, options)
    options?.signal?.throwIfAborted()
    const timeout = options?.timeout ?? defaultTimeout
    const timeoutCtrl = new AbortController()
    const timeoutTimer = setTimeout(() => timeoutCtrl.abort(new TimeoutException()), timeout)
    const signal = mergeSignals(options?.signal, timeoutCtrl.signal)
    const resp = await fetch(req, { signal }).finally(() => clearTimeout(timeoutTimer))
    return responseHandler(resp)
  }
}

export type QueryParams = {
  [k: string]: unknown
}

export function withQueryParams(url: string, params: QueryParams) {
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

export type PaginationParams = {
  pageSize?: number
  pageIndex?: number
}

export type ByPage<T> = {
  total: number
  data: T[]
}

export const ownerAll = '*'

export enum Visibility {
  Private = 'private',
  Public = 'public'
}

/** Url with 'http:', 'https:', or 'data:' schemes, used for web resources that can be accessed directly via `fetch()` */
export type WebUrl = string

/** Url for universal resources, which could be either a WebUrl or a Url with a custom scheme like 'kodo:' */
export type UniversalUrl = string

/** Map from UniversalUrl to WebUrl */
export type UniversalToWebUrlMap = {
  [universalUrl: UniversalUrl]: WebUrl
}

/** Map from relative path to UniversalUrl */
export type FileCollection = {
  [path: string]: UniversalUrl
}

/** Get time string for spx-backend APIs */
export function timeStringify(time: number) {
  return new Date(time).toISOString()
}

export const client = new Client()
