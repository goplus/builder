/**
 * @desc Client (& exception) definition for spx-backend APIs
 */

import { apiBaseUrl } from '@/utils/env'
import { ApiException, ApiExceptionCode } from './exception'
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

async function readApiExceptionPayload(resp: Response): Promise<ApiExceptionPayload | null> {
  try {
    const body = await resp.json()
    return isApiExceptionPayload(body) ? body : null
  } catch {
    return null
  }
}

function parseRetryAfter(header: string | null): number | null {
  if (header == null) return null
  const seconds = parseInt(header, 10)
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null
}

async function handleFailedResponse(resp: Response): Promise<never> {
  const retryAfterSeconds = parseRetryAfter(resp.headers.get('Retry-After'))
  const payload = await readApiExceptionPayload(resp)
  if (payload == null) {
    throw new ApiException(ApiExceptionCode.errorUnknown, 'api call failed', {
      status: resp.status,
      retryAfterSeconds
    })
  }
  throw new ApiException(payload.code, payload.msg, {
    status: resp.status,
    retryAfterSeconds
  })
}

export class Client {
  private request = useRequest(apiBaseUrl, async (resp) => {
    if (!resp.ok) {
      await handleFailedResponse(resp)
    }
    if (resp.status === 204) return null
    return resp.json()
  })

  private requestTextStream = useRequest(apiBaseUrl, async function* (resp): AsyncIterableIterator<string> {
    if (!resp.ok) {
      await handleFailedResponse(resp)
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

  put(path: string, payload?: unknown, options?: Omit<RequestOptions, 'method'>) {
    return this.request(path, payload, { ...options, method: 'PUT' })
  }

  delete(path: string, params?: QueryParams, options?: Omit<RequestOptions, 'method'>) {
    if (params != null) path = withQueryParams(path, params)
    return this.request(path, null, { ...options, method: 'DELETE' })
  }
}
