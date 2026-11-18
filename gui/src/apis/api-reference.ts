import { client } from './common'

export type APIReferenceSearchParams = {
  query: string
  candidates: Array<{ id: string; text: string }>
}

export type APIReferenceSearchResult = {
  results: Array<{ id: string; score: number }>
}

export function createAPIReferenceSearch(params: APIReferenceSearchParams, signal?: AbortSignal) {
  return client.post('/api-reference-searches', params, { signal, timeout: 15000 }) as Promise<APIReferenceSearchResult>
}
