import type { MessageEvent } from '@/apis/copilot'
import type { Message } from '@/apis/copilot'
import type { IMessageEventGenerator } from './copilot'

const tutorialGuideResponse = `我会作为教程 Copilot 帮你完成当前课程。

先看左侧 API 列表，本课程会用到的积木已经筛选出来了。请把需要的 API 拖到代码编辑区，优先完成当前步骤；如果运行结果不符合预期，再告诉我你看到的现象，我会继续给下一步提示。`

const localPreviewResponse = `我正在本地预览模式下运行，可以在不登录的情况下检查教程引导、消息流程和交互状态。

${tutorialGuideResponse}`

function isTutorialMessage(messages: Message[]) {
  return messages.some((message) => {
    if (message.content?.type !== 'text') return false
    const text = message.content.text
    return text.includes('<course>') || text.includes('Course Started') || text.includes('课程开始')
  })
}

export function createLocalPreviewCopilotGenerator(): IMessageEventGenerator {
  return {
    async *generateCopilotMessage(messages): AsyncIterableIterator<MessageEvent> {
      const response = isTutorialMessage(messages) ? tutorialGuideResponse : localPreviewResponse
      yield {
        type: 'text_delta',
        data: {
          text: response
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
