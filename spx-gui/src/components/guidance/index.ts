import { useModal } from '@/components/ui'
import WholeStoryLineProjectCreateModal from './WholeStoryLineProjectCreateModal.vue'
import type { LocaleMessage } from '@/utils/i18n'
import type { Project } from '@/models/project'
export function useCreateWholeStoryLineProject() {
  const modal = useModal(WholeStoryLineProjectCreateModal)

<<<<<<< HEAD
  return async function createWholeStoryLineProject(title: LocaleMessage, project: Project) {
    return modal({ title, project })
=======
  return async function createWholeStoryLineProject(title: LocaleMessage, project?: Project) {
    let projectFile: File | undefined
    if (project) {
      projectFile = await project.exportGbpFile()
    }
    return modal({ title, projectFile })
>>>>>>> 8cc5fbd9cf62e5751704dace34c87da2a0e0a2f6
  }
}
