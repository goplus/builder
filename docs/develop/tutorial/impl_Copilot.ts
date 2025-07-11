import { Disposer, LocaleMessage, copilotApis, validateSchema } from './base'
import { Copilot as ICopilot, ICopilotContextProvider, ICopilotToolsProvider, MarkdownString, Message, Topic } from './module_Copilot'
import { Message as ApiMessage } from './module_CopilotApis'

type Session = {
  topic: Topic
  messages: Message[]
}

abstract class Copilot implements ICopilot {

  abstract startSession(topic: Topic, userMessage?: Message): Promise<void>
  abstract endCurrentSession(): void
  abstract addUserMessage(message: Message, topic: Topic): void
  abstract notifyUserEvent(name: LocaleMessage, detail: MarkdownString): void

  private contextProviders: ICopilotContextProvider[] = []

  registerContextProvider(provider: ICopilotContextProvider): Disposer {
    this.contextProviders.push(provider)
    return () => this.contextProviders = this.contextProviders.filter(p => p !== provider)
  }

  private getContextMessage(): ApiMessage {
    const contexts: string[] = []
    for (const provider of this.contextProviders) {
      contexts.push(provider.provideContext())
    }
    const content = contexts.join('\n\n')
    return {
      role: 'user',
      content: {
        type: 'text',
        text: `Here's the current context info:\n\n${content}`
      }
    }
  }

  private toolsProviders: ICopilotToolsProvider[] = []

  registerToolsProvider(provider: ICopilotToolsProvider): Disposer {
    this.toolsProviders.push(provider)
    return () => this.toolsProviders = this.toolsProviders.filter(p => p !== provider)
  }

  // TODO: details about when & how functions are called, how to save results and how to handle errors, etc.
  private async callFunctionTool(name: string, params: any): Promise<any> {
    for (const provider of this.toolsProviders) {
      const tools = provider.provideTools()
      for (const tool of tools) {
        if (tool.type === 'function' && tool.name === name) {
          validateSchema(tool.parameters, params)
          return await tool.implementation(params)
        }
      }
    }
    throw new Error(`Function tool "${name}" not found`)
  }

  abstract adaptMessage(message: Message): ApiMessage

  private async *getChatCompletion(session: Session): AsyncIterableIterator<string> {
    const messages = session.messages.map(msg => this.adaptMessage(msg))
    messages.push(this.getContextMessage())
    yield* copilotApis.generateStreamMessage(messages)
  }
}
