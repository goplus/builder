/**
 * @desc util-related APIs of spx-backend
 */

import { client } from './common'

export interface FormatError {
  Column: number
  Line: number
  Msg: string
}

export interface FormatResponse {
  Body: string
  Error: FormatError
}

export function formatSpxCode(body: string) {
  return client.post('/util/fmt', { body }) as Promise<FormatResponse>
}

export type UpInfo = {
  /** Uptoken */
	token: string
	/** Valid time for uptoken, unit: second */
	expires: number
	/** Base URL to fetch file */
	baseUrl: string
  /** Bucket Region */
  region: string
}

export function getUpInfo() {
  return client.get('/util/upinfo') as Promise<UpInfo>
}
