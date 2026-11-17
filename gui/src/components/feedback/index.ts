import { defineAsyncComponent } from 'vue'
import { useModal } from '@/components/ui'
import type { FeedbackSource } from './context'
import type { FeedbackDraft } from './FeedbackModal.vue'

// Load on demand: Copilot in the initial bundle opens it, and it depends on the editor modules
const FeedbackModal = defineAsyncComponent(() => import('./FeedbackModal.vue'))

export function useSendFeedback() {
  const invokeFeedbackModal = useModal(FeedbackModal)
  return function sendFeedback(source: FeedbackSource, draft: FeedbackDraft | null = null) {
    return invokeFeedbackModal({ source, draft })
  }
}
