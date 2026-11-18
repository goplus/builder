import { defineAsyncComponent } from 'vue'
import type { Feedback } from '@/apis/feedback'
import { useModal } from '@/components/ui'
import type { FeedbackSource } from './context'
import type { FeedbackDraft } from './FeedbackModal.vue'

const loadFeedbackModal = () => import('./FeedbackModal.vue')
// Load on demand: Copilot in the initial bundle opens it, and it depends on the editor modules
const FeedbackModal = defineAsyncComponent(loadFeedbackModal)

// One Feedback form at a time: Copilot buttons stay clickable above the modal mask,
// so another click gets the open form's result instead of stacking a second form.
let openForm: Promise<Feedback> | null = null

export function useSendFeedback() {
  const invokeFeedbackModal = useModal(FeedbackModal)
  return function sendFeedback(source: FeedbackSource, draft: FeedbackDraft | null = null) {
    if (openForm == null) {
      // Load before opening: a modal that fails to load never settles and would block every later try.
      openForm = loadFeedbackModal()
        .then(() => invokeFeedbackModal({ source, draft }))
        .finally(() => {
          openForm = null
        })
    }
    return openForm
  }
}
