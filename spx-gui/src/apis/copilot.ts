/**
 * @desc Copilot-related APIs of spx-backend
 */

import { client } from './common'

export type MessageContent = {
  type: 'text'
  text: string
}

export type Message = {
  role: 'user' | 'copilot'
  content: MessageContent
}

export async function generateMessage(messages: Message[], signal?: AbortSignal) {
  return (await client.post('/copilot/message', { messages }, { timeout: 15 * 1000, signal })) as Message
}
