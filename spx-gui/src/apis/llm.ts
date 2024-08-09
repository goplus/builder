/**
 * @desc LLM-related APIs of spx-backend
 */

import {client} from './common'

export type ProjectContext = {
    ProjectName: string
    ProjectVariable: ProjectVariable
    ProjectCode: Code[]
}

export type ProjectVariable = {
    Type: string  // Sprites, Sounds, Stage, Costumes
    Name: string
}

export type Code = {
    Type: string
    Name: string
    Src: string
}

export type AIStartChatParams = {
    ChatAction: number // "Explain" | "Comment" | "FixCode"
    ProjectContext: ProjectContext
    UserInput: string
    UserLang: number // "english" | "chinese"
}

export type AIChatParams = {
    UserInput: string
}

export type AITaskParams = {
    TaskAction: number
    ProjectContext: ProjectContext
    UserCode: string
    UserCursor: Cursor
}

export type Cursor = {
    Line: number
    Column: number
}

export type ChatResp = {
    ID           : string
    RespMessage  : string
    RespQuestions: string[]
}

export type TaskResp = {
    TaskAction   :number
    CodeSuggests :CodeSuggest
    // ...
}

export type CodeSuggest = {
    Label    :  string
    InsertText: string
}

export async function startChat(params: AIStartChatParams) {
    return client.post('/llm/chat',params) as Promise<ChatResp>
}

export async function nextChat(chatID: string,params: AIChatParams) {
    return client.post('/llm/chat/'+ chatID,params) as Promise<ChatResp>
}

export async function startTask(params: AITaskParams) {
    return client.post('/llm/task',params) as Promise<TaskResp>
}