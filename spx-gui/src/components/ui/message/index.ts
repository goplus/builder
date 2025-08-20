import { useMessage as useNMessage, type MessageOptions } from 'naive-ui'
import { useMessageEvents } from './UIMessageProvider.vue'

export { default as UIMessageProvider } from './UIMessageProvider.vue'

export function useMessage() {
  const nMessage = useNMessage()
  const messageEvents = useMessageEvents()

  const options: MessageOptions = {
    closable: false
  }

  return {
    info(content: string) {
      nMessage.info(content, options)
      messageEvents.emit('message', { type: 'info', content })
    },
    success(content: string) {
      nMessage.success(content, options)
      messageEvents.emit('message', { type: 'success', content })
    },
    warning(content: string) {
      nMessage.warning(content, options)
      messageEvents.emit('message', { type: 'warning', content })
    },
    error(content: string) {
      nMessage.error(content, options)
      messageEvents.emit('message', { type: 'error', content })
    },
    async withLoading<T>(promise: Promise<T>, content: string): Promise<T> {
      const reactive = nMessage.loading(content, { ...options, duration: 0 })
      return promise.finally(() => reactive.destroy())
    }
  }
}
