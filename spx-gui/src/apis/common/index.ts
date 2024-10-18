import { Exception } from '@/utils/exception'
import { Client } from './client'

/** TokenProvider provides access token used for the Authorization header */
export type TokenProvider = () => Promise<string | null>

let tokenProvider: TokenProvider = async () => null
export function setTokenProvider(provider: TokenProvider) {
  tokenProvider = provider
}

/** ReponseHandler handles the response from fetch() */
export type ResponseHandler = (resp: Response) => Promise<unknown>

export type RequestOptions = {
  method: string
  headers?: Headers
  /** Timeout duration in milisecond, from request-sent to server-response-got */
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

export function useRequest(
  baseUrl: string = '',
  responseHandler?: ResponseHandler,
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
    return responseHandler != null ? responseHandler(resp) : resp
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
