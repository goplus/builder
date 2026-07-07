import type { MessageEvent } from '@/apis/copilot'
import type { IMessageEventGenerator } from './copilot'

const localPreviewResponse =
  'Copilot is running in local preview mode. You can review the panel, error entry, message flow, and interaction states without signing in. This mock response does not call the remote AI service.'

export function createLocalPreviewCopilotGenerator(): IMessageEventGenerator {
  return {
    async *generateCopilotMessage(): AsyncIterableIterator<MessageEvent> {
      yield {
        type: 'text_delta',
        data: {
          text: localPreviewResponse
        }
      }
      yield {
        type: 'done',
        data: {
          finishReason: 'stop'
        }
      }
    }
  }
}

export function shouldUseLocalPreviewCopilot() {
  return import.meta.env.DEV && import.meta.env.VITE_COPILOT_LOCAL_PREVIEW === 'true'
}
