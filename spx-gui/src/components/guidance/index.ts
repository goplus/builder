import { useModal } from '@/components/ui'
import WholeStoryLineProjectCreateModal from './WholeStoryLineProjectCreateModal.vue'
import type { LocaleMessage } from '@/utils/i18n'
import type { Project } from '@/models/project'
export function useCreateWholeStoryLineProject() {
  const modal = useModal(WholeStoryLineProjectCreateModal)

  return async function createWholeStoryLineProject(title: LocaleMessage, project: Project) {
    return modal({ title, project })
  }
}
