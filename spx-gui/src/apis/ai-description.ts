/**
 * @desc AI description generation APIs of spx-backend
 */

import { client } from './common'

export async function generateAIDescription(content: string, signal?: AbortSignal) {
  const result = (await client.post('/ai/description', { content }, { signal, timeout: 60 * 1000 })) as {
    description: string
  }
  return result.description
}
