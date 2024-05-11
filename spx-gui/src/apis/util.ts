/**
 * @desc util-related APIs of spx-backend
 */

import { client } from './common'

export interface FormatError {
  column: number
  line: number
  msg: string
}

export interface FormatResponse {
  body: string
  error?: FormatError
}

export function formatSpxCode(body: string) {
  return client.post('/util/fmtcode', { body }) as Promise<FormatResponse>
}

export type UpInfo = {
  /** Uptoken */
  token: string
  /** Valid time for uptoken, unit: second */
  expires: number
  /** Maximum file size allowed in bytes */
  maxSize: number
  /** Base URL to fetch file */
  baseUrl: string
  /** Bucket Region */
  region: string
}

export function getUpInfo() {
  return client.get('/util/upinfo') as Promise<UpInfo>
}
