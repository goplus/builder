import { useMessage as useNMessage } from 'naive-ui'

// TODO: style design for message not finished yet

export function useMessage() {
  const nMessage = useNMessage()

  return {
    info(content: string) {
      nMessage.info(content)
    },
    success(content: string) {
      nMessage.success(content)
    },
    error(content: string) {
      nMessage.error(content)
    }
    // We do not provide loading message (which do loading-feedback globally),
    // instead, we do loading-feedback in-place, with
    // * component `UILoading`
    // * prop `loading` for components like `UIButton`
  }
}
