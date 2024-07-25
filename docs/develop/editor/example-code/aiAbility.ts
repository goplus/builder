// discard! 

/* 
type Input = {
    input: string
    lang: string
}

type SuggestTaskInput = Input
type ExplainChatInput = Input
type CommentChatInput = Input
type FixCodeChatInput = Input

type SuggestTaskResult = {
    label: string
    insertText: string
}

type ReplyAction = {
    message: string
}

type Markdown = string

enum AIAction {
    Suggest = "suggest",
    Explain = "explain",
    Question = "question",
    Comment = "comment",
    FixCode = "fixcode",
}

type Position = {
    Line: number,
    Column: number
}

type AITemplate = {
    template: string
    postion: Position
}

type PromptTemplate = {
    [K in AIAction]: string
}

type Prompt = string
type Token = string

interface GenerateOption {
    AIAction: AIAction
    CodeSlice: string
    ProjectContext
}

enum AIPlatform {
    OpenAI,
    Alibaba
}

interface ResultOption {
    Prompt: string
    AIPlatform: AIPlatform
}

interface TokenResult {
    Success: boolean
    ResultObject: object
}

interface AIAbility {
    // task
    startSuggestTask(input: SuggestTaskInput): SuggestTaskResult

    // chat
    startExplainChat(input: ExplainChatInput): Chat
    startCommentChat(input: CommentChatInput): Chat
    startFixCodeChat(input: FixCodeChatInput): Chat

    //self
    aiAction: AIAction

    promptTemplate: PromptTemplate

    generatePrompt(generateOption: GenerateOption): Prompt
    getResult(resultOption: ResultOption): Token
    ParseToken(token: Token, aiAction: AIAction): TokenResult
}

type Message = {
    content: Markdown
    actions: ReplyAction[]
}
interface Chat {
    First: boolean
    sendUserMessage(userMessage: Message): Promise<Message>
}

*/