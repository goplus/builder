import { useModal, useConfirmDialog } from '@/components/ui'
import { Visibility, deleteProject } from '@/apis/project'
import { useI18n } from '@/utils/i18n'
import type { Project } from '@/models/project'
import type { ProjectData } from '@/apis/project'
import ProjectCreateModal from './ProjectCreateModal.vue'
import ProjectOpenModal from './ProjectOpenModal.vue'
import ProjectDirectShareModal from './sharing/ProjectDirectShare.vue'
import ProjectPublishModal from './ProjectPublishModal.vue'
import ProjectPublishedModal from './ProjectPublishedModal.vue'
/**
 * How to update the default project:
 * 1. Use XBuilder to create / open a project.
 * 2. Edit it as needed.
 * 3. Export the project file (`.xbp`).
 * 4. Replace `./default-project.xbp` with the exported file.
 */
import defaultProjectFileUrl from './default-project.xbp?url'

/**
 * Get the default project file as a File object
 * @returns Promise resolving to a File object of the default project template
 */
export async function getDefaultProjectFile(): Promise<File> {
  const resp = await fetch(defaultProjectFileUrl)
  const blob = await resp.blob()
  return new window.File([blob], 'default-project.xbp', { type: blob.type })
}

export function useCreateProject() {
  const modal = useModal(ProjectCreateModal)

  return function createProject(remixSource?: string) {
    return modal({ remixSource })
  }
}

export function useOpenProject() {
  const modal = useModal(ProjectOpenModal)

  return function openProject() {
    return modal({})
  }
}

export function useRemoveProject() {
  const { t } = useI18n()
  const withConfirm = useConfirmDialog()

  return async function removeProject(owner: string, name: string) {
    return withConfirm({
      title: t({ en: `Remove project ${name}`, zh: `删除项目 ${name}` }),
      content: t({
        en: `Removed projects can not be recovered. Are you sure you want to remove project ${name}?`,
        zh: `删除后的项目无法恢复，确定要删除项目 ${name} 吗？`
      }),
      // TODO: message for exception
      confirmHandler: () => deleteProject(owner, name)
    })
  }
}

export function useShareProject() {
  const modal = useModal(ProjectDirectShareModal)

  return async function shareProject(projectData: ProjectData) {
    await modal({ projectData })
  }
}

export function usePublishProject() {
  const invokePublishModal = useModal(ProjectPublishModal)
  const invokePublishedModal = useModal(ProjectPublishedModal)

  return async function publishProject(project: Project) {
    await invokePublishModal({ project })
    invokePublishedModal({ project })
  }
}

export function useUnpublishProject() {
  const { t } = useI18n()
  const withConfirm = useConfirmDialog()

  // TODO: message for exception
  async function makePrivate(project: Project) {
    project.setVisibility(Visibility.Private)
    await project.saveToCloud()
  }

  return async function unpublishProject(project: Project) {
    return withConfirm({
      title: t({ en: 'Unpublish project', zh: '取消发布项目' }),
      content: t({
        en: 'If project unpublished, others will no longer have access to the current project, and its sharing links will expire. Would you like to proceed?',
        zh: '如果取消发布，其他人将无法访问当前项目，且分享链接将会失效。确认继续吗？'
      }),
      confirmHandler: () => makePrivate(project)
    })
  }
}
