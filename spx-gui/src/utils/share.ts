import type { MessageApiInjection } from 'naive-ui/es/message/src/MessageProvider'

export const copyShareLink = async (owner: string, name: string, message: MessageApiInjection) => {
  await navigator.clipboard.writeText(`${location.origin}/share/${owner}/${name}`)
  message.success('TODO: i18n: Share link copied to clipboard')
}
