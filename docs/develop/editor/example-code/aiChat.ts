import { ReplyAction } from './ui'

export type Message = {
    content: string,
    actions: ReplyAction[]
}

export interface Chat {
    First: boolean,
    sendUserMessage(useressage: string): Promise<Message>
}

type Input = {
    input: string
    lang: string
}

type ExplainChatInput = Input
type CommentChatInput = Input
type FixCodeChatInput = Input

export interface ChatBot {
    startExplainChat(input: ExplainChatInput): Chat
    startCommentChat(input: CommentChatInput): Chat
    startFixCodeChat(input: FixCodeChatInput): Chat
}
