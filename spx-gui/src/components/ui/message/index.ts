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
    }
    // We do not provide loading message (which do loading-feedback globally),
    // instead, we do loading-feedback in-place, with
    // * component `UILoading`
    // * prop `loading` for components like `UIButton`
  }
}
