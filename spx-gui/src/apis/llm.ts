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
  respMessage: string
  respQuestions: string[]
}

export type TaskResp = {
  taskAction: number
  suggestions: CodeSuggest[] | null
}

export type CodeSuggest = {
  label: string
  insertText: string
}

export async function startChat(params: AIStartChatParams) {
  return (await client.post('/llm/chat', params, { timeout: 40000 })) as Promise<ChatResp>
}

export async function nextChat(chatID: string, params: AIChatParams) {
  const encodedChatID = encodeURIComponent(chatID)
  return (await client.post(`/llm/chat/${encodedChatID}`, params, {
    timeout: 40000
  })) as Promise<ChatResp>
}

export async function deleteChat(chatID: string) {
  const encodedChatID = encodeURIComponent(chatID)
  return (await client.delete(`/llm/chat/${encodedChatID}`)) as Promise<void>
}

export async function startTask(params: AITaskParams) {
  return (await client.post('/llm/task', params, { timeout: 40000 })) as Promise<TaskResp>
}
