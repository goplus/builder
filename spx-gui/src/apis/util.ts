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

export async function uptoken() {
  const resp = client.get('/util/uptoken') as Promise<{ token: string }>
  return (await resp).token
}
