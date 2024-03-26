/**
 * @desc Client (& error) definition for spx-backend APIs
 */

import { apiBaseUrl } from '@/util/env'
import { ApiError } from './error'

export type RequestOptions = {
  method: string
  headers?: Headers
}

/** Response body when error encountered for API calling */
export type ApiErrorPayload = {
  /** Code for program comsuming */
  code: number
  /** Message for developer reading */
  msg: string
}

function isApiErrorPayload(body: any): body is ApiErrorPayload {
  return body && (typeof body.code === 'number') && (typeof body.msg === 'string')
}

/** AuthProvider provide value for header Authorization */
export type AuthProvider = () => Promise<string | null>

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
    // TODO: timeout
    if (!resp.ok) {
      const body = await resp.json()
      if (!isApiErrorPayload(body)) {
        throw new Error('api call failed')
      }
      throw new ApiError(body.code, body.msg)
    }
    return resp.json()
  }

  private async request(url: string, payload: unknown, options?: RequestOptions) {
    const req = await this.prepareRequest(url, payload, options)
    const resp = await fetch(req)
    return this.handleResponse(resp)
  }

  get(url: string, params?: QueryParams) {
    url = params == null ? url : withQueryParams(url, params)
    return this.request(url, null, { method: 'GET' })
  }

  post(url: string, payload?: unknown) {
    return this.request(url, payload, { method: 'POST' })
  }

  put(url: string, payload?: unknown) {
    return this.request(url, payload, { method: 'PUT' })
  }

  delete(url: string, params?: QueryParams) {
    url = params == null ? url : withQueryParams(url, params)
    return this.request(url, null, { method: 'DELETE' })
  }

}

type QueryParams = {
  [k: string]: unknown
}

function withQueryParams(url: string, params: QueryParams) {
  const usp = new URLSearchParams()
  Object.keys(params).forEach(k => {
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
