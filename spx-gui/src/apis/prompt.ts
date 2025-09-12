import { apiBaseUrl } from '@/utils/env'

export const getPrompt = async (prefix: string, limit: number) => {
  const response = await fetch(`${apiBaseUrl}/game/assets/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefix, limit })
  })
  if (!response.ok) {
    throw new Error('Failed to fetch prompt')
  }
  const data = await response.json()

  return data.data.suggestions
}
