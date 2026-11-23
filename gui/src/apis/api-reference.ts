import { client } from './common'

export type APIReferenceSearchParams = {
  query: string
  candidates: string[]
}

export type APIReferenceSearchResult = {
  scores: number[]
}

export function createAPIReferenceSearch(params: APIReferenceSearchParams, signal?: AbortSignal) {
  return client.post('/api-reference-searches', params, { signal, timeout: 15000 }) as Promise<APIReferenceSearchResult>
}
