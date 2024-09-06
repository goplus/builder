/**
 * @desc LLM-related APIs of spx-backend
 */

import { client } from './common'

export type ProjectContext = {
  projectName?: string
  projectVariables: ProjectVariable[]
  projectCode: Code[]
}

export type ProjectVariable = {
  type: string // Sprites, Sounds, Stage, Costumes
  name: string
}

export type Code = {
  type: string
  name: string
  src: string
}

export enum ChatAction {
  _,
  explain,
  comment,
  fixCode
}

export enum UserLang {
  _,
  english,
  chinese
}

export type AIStartChatParams = {
  chatAction: ChatAction // "Explain" | "Comment" | "FixCode"
  projectContext: ProjectContext
  userInput: string
  userLang: UserLang // "english" | "chinese"
}

export type AIChatParams = {
  userInput: string
}

export enum TaskAction {
  _,
  suggest
}

export type AITaskParams = {
  taskAction: TaskAction
  projectContext: ProjectContext
  userCode: string
  userCursor: Cursor
}

export type Cursor = {
  line: number
  column: number
}

export type ChatResp = {
  id: string
  resp_message: string
  resp_questions: string[]
}

export type TaskResp = {
  taskAction: number
  codeSuggests: CodeSuggest[]
}

export type CodeSuggest = {
  label: string
  insertText: string
}

export async function startChat(params: AIStartChatParams) {
  return client.post('/llm/chat', params, {timeout: 20000}) as Promise<ChatResp>
}

export async function nextChat(chatID: string, params: AIChatParams) {
  const encodedChatID = encodeURIComponent(chatID)
  return client.post(`/llm/chat/${encodedChatID}`, params, {timeout: 20000}) as Promise<ChatResp>
}

export async function deleteChat(chatID: string) {
  const encodedChatID = encodeURIComponent(chatID)
  return client.delete(`/llm/chat/${encodedChatID}`) as Promise<void>
}

export async function startTask(params: AITaskParams) {
  return client.post('/llm/task', params, {timeout: 20000}) as Promise<TaskResp>
}
