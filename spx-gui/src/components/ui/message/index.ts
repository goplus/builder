import { useMessage as useNMessage, type MessageOptions } from 'naive-ui'

export { default as UIMessageProvider } from './UIMessageProvider.vue'

export function useMessage() {
  const nMessage = useNMessage()

  const options: MessageOptions = {
    closable: false
  }

  return {
    info(content: string) {
      nMessage.info(content, options)
    },
    success(content: string) {
      nMessage.success(content, options)
    },
    warning(content: string) {
      nMessage.warning(content, options)
    },
    error(content: string) {
      nMessage.error(content, options)
    },
    async withLoading<T>(promise: Promise<T>, content: string): Promise<T> {
      const reactive = nMessage.loading(content, { ...options, duration: 0 })
      return promise.finally(() => reactive.destroy())
    }
  }
}
