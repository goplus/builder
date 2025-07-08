import { LocaleMessage, Disposer, JSONSchemaObject, Component } from './base'

export type MarkdownString = string

/** Message with text content. */
export type TextMessage = {
  type: 'text'
  role: 'user' | 'copilot' | 'tool'
  content: MarkdownString
}

/**
 * Message for user events.
 * For example, the user opened a project, or the user ran a project, etc.
 */
export type EventMessage = {
  type: 'event'
  role: 'user'
  /**
   * Name of the event, for display purpose.
   * The name should be localized, e.g. { en: 'Project Runner Exit with 0', zh: '项目运行正常退出' }
   */
  name: LocaleMessage
  /** Detailed description of the event, for prompt purpose. */
  detail: MarkdownString
}

export type Message = TextMessage | EventMessage

export type Topic = {
  /**
   * Description of the topic. Sample:
   * * "Now you are about to help the user to fix a bug in the code."
   * * "Now you will help the user to finish learning a course. The course is about ..."
   */
  description: string
  /** Whether the copilot should react to user events under the topic */
  reactToEvents: boolean
}

/**
 * ICopilotContextProvider is interface for copilot-context-providers.
 * It provides context information which is sent to the copilot together with chat messages.
 */
export interface ICopilotContextProvider {
  /**
   * Provide context information for the copilot.
   * Use plain text in English.
   */
  provideContext(): string
}

export type CustomElementTool = {
  type: 'custom-element'
  /** Tag name for the tool. */
  tagName: string
  /**
   * Description of the tool about what it does and how to use it.
   * It will be used in the copilot's prompt.
   */
  description: string
  /** Attributes definition for the tool (Element). */
  attributes: JSONSchemaObject
  /** Component to render the tool in the UI. */
  component: Component
}

export type FunctionTool = {
  type: 'function'
  /** Name of the function. */
  name: string
  /** Description of the function about what it does and how to use it. */
  description: string
  /** Parameters definition for the function. */
  parameters: JSONSchemaObject
  /** Function to call when the tool is used. */
  implementation: (params: any) => Promise<any>
}

export type Tool = CustomElementTool | FunctionTool

export interface ICopilotToolsProvider {
  /**
   * Provide tools for the copilot.
   * The tools should be returned as an array.
   */
  provideTools(): Tool[]
}

export interface Copilot {

  /**
   * Start a new session for the copilot.
   * If a session is already running, it will be ended first.
   */
  startSession(topic: Topic, userMessage?: Message): Promise<void>

  /** End the current session. */
  endCurrentSession(): void

  /**
   * Add a user message in current session.
   * If no session is running, a new session will be started with given message and topic.
   */
  addUserMessage(message: Message, topic: Topic): void

  /**
   * Notify the copilot of a user event.
   * If no session is running, nothing will happen.
   */
  notifyUserEvent(name: LocaleMessage, detail: MarkdownString): void

  /** Register a context provider for the copilot. */
  registerContextProvider(provider: ICopilotContextProvider): Disposer

  /** Register a tools provider for the copilot. */
  registerToolsProvider(provider: ICopilotToolsProvider): Disposer
}
