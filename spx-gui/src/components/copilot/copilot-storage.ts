import { isArray } from 'lodash'

import {
  Copilot,
  isCopilotMessage,
  isToolMessage,
  isTopic,
  isUserMessage,
  Round,
  RoundState,
  Session,
  type CopilotMessage,
  type ToolMessage,
  type Topic,
  type UserMessage
} from './copilot'

export interface CopilotSessionStorage {
  save(session: Session): Promise<void>
  load(copilot: Copilot): Promise<Session | null>
  clear(): Promise<void>
}

type SerializedRound = {
  userMessage: UserMessage
  resultMessages: Array<CopilotMessage | ToolMessage>
}

type SerializedSession = {
  topic: Omit<Topic, 'stateIndicator'>
  rounds: SerializedRound[]
}

function deserializeTopic(o: any): Topic | null {
  return isTopic(o) ? o : null
}

function deserializeUserMessage(o: any): UserMessage | null {
  return isUserMessage(o) ? o : null
}

function deserializeResultMessage(o: any): CopilotMessage | ToolMessage | null {
  if (isCopilotMessage(o)) {
    return o
  }
  if (isToolMessage(o)) {
    return o
  }
  return null
}

function serializeRound(round: Round): SerializedRound {
  return {
    userMessage: { ...round.userMessage },
    resultMessages: [...round.resultMessages]
  }
}

function deserializeRound(data: any, copilot: Copilot, session: Session): Round | null {
  let round = null

  let { userMessage, resultMessages } = data

  userMessage = deserializeUserMessage(userMessage)
  if (!userMessage) return round

  if (isArray(resultMessages)) {
    resultMessages = resultMessages.flatMap((o) => deserializeResultMessage(o) ?? [])
  }

  round = new Round(userMessage, copilot, session)
  round.resultMessages.push(...resultMessages)
  return round
}

function serializeSession(session: Session): SerializedSession {
  return {
    topic: {
      title: session.topic.title,
      description: session.topic.description,
      reactToEvents: session.topic.reactToEvents,
      endable: session.topic.endable
    },
    rounds: session.rounds.flatMap((round) => (round.state !== RoundState.InProgress ? serializeRound(round) : []))
  }
}

function deserializeSession(data: any, copilot: Copilot) {
  let session: Session | null = null
  const { topic = {}, rounds = [] } = data ?? {}

  const topicObject = deserializeTopic(topic)
  if (!topicObject) {
    return session
  }

  session = new Session(topicObject, copilot)
  session.rounds.push(...rounds.flatMap((o: any) => deserializeRound(o, copilot, session as Session) ?? []))
  return session
}

const sessionLocalStorageKey = 'spx-gui-copilot-session'

export class LocalStorageSessionStorage implements CopilotSessionStorage {
  async save(session: Session): Promise<void> {
    try {
      localStorage.setItem(sessionLocalStorageKey, JSON.stringify(serializeSession(session)))
    } catch (e) {
      console.error('Failed to save copilot session:', e)
      throw e
    }
  }

  async load(copilot: Copilot): Promise<Session | null> {
    try {
      const item = localStorage.getItem(sessionLocalStorageKey)
      if (!item) return null
      return deserializeSession(JSON.parse(item), copilot)
    } catch (e) {
      console.error('Failed to load copilot session:', e)
      throw e
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(sessionLocalStorageKey)
  }
}
