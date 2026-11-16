import { useModal } from '@/components/ui'
import type { FeedbackSource } from './context'
import FeedbackModal, { type FeedbackDraft } from './FeedbackModal.vue'

export function useSendFeedback() {
  const invokeFeedbackModal = useModal(FeedbackModal)
  return function sendFeedback(source: FeedbackSource, draft: FeedbackDraft | null = null) {
    return invokeFeedbackModal({ source, draft })
  }
}
