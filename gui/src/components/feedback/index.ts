import { useModal } from '@/components/ui'
import type { FeedbackSource } from './context'
import FeedbackModal from './FeedbackModal.vue'

export function useSendFeedback() {
  const invokeFeedbackModal = useModal(FeedbackModal)
  return function sendFeedback(source: FeedbackSource) {
    return invokeFeedbackModal({ source })
  }
}
