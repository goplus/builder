import { client } from './common'

export const getPrompt = async (prefix: string, limit: number) => {
  const response = await client.post('/game/assets/complete', {
    prefix,
    limit
  })
  if (!response.success) {
    throw new Error('Failed to fetch prompt')
  }
  const data = await response.data
  return data.suggestions
}
