/**
 * @desc AI-related APIs of spx-backend
 */

import { client } from './common'

export async function matting(imageUrl: string) {
  const result = (await client.post('/aigc/matting', { imageUrl }, { timeout: 20 * 1000 })) as {
    imageUrl: string
  }
  return result.imageUrl
}
