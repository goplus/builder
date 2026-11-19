import { defineAsyncComponent } from 'vue'
import { useModal } from '@/components/ui'
import type { FeedbackSource } from './context'
import type { FeedbackDraft } from './FeedbackModal.vue'

const loadFeedbackModal = () => import('./FeedbackModal.vue')
// Load on demand: Copilot in the initial bundle opens it, and it depends on the editor modules
const FeedbackModal = defineAsyncComponent(loadFeedbackModal)

export function useSendFeedback() {
  const invokeFeedbackModal = useModal(FeedbackModal)
  /**
   * Open the Feedback form. It settles when the form closes, so entries that stay clickable
   * above the modal mask, such as those in Copilot, can stay disabled until then.
   */
  return async function sendFeedback(source: FeedbackSource, draft: FeedbackDraft | null = null) {
    // Load first: a modal whose component fails to load never settles, which would leave its entry disabled.
    await loadFeedbackModal()
    return invokeFeedbackModal({ source, draft })
  }
}
