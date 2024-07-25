import { useRouter } from 'vue-router'
import { useModal, useConfirmDialog, useMessage } from '@/components/ui'
import { IsPublic, deleteProject } from '@/apis/project'
import ProjectCreateModal from './ProjectCreateModal.vue'
import ProjectOpenModal from './ProjectOpenModal.vue'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import type { Project } from '@/models/project'
import { getProjectEditorRoute, getProjectShareRoute } from '@/router'

export function useCreateProject() {
  const modal = useModal(ProjectCreateModal)

  return function createProject() {
    return modal({})
  }
}

export function useOpenProject() {
  const router = useRouter()
  const modal = useModal(ProjectOpenModal)

  return async function openProject() {
    const project = await modal({})
    router.push(getProjectEditorRoute(project.name))
  }
}

export function useRemoveProject() {
  const withConfirm = useConfirmDialog()
  const { t } = useI18n()

  return async function removeProject(owner: string, name: string) {
    return withConfirm({
      title: t({ en: `Remove project ${name}`, zh: `删除项目 ${name}` }),
      content: t({
        en: `Removed projects can not be recovered. Are you sure you want to remove project ${name}?`,
        zh: `删除后的项目无法恢复，确定要删除项目 ${name} 吗？`
      }),
      confirmHandler: () => deleteProject(owner, name)
    })
  }
}

/** Copy sharing link for given project */
export function useShareProject() {
  const m = useMessage()
  const { t } = useI18n()
  return async function shareProject(project: Project) {
    const { owner, name } = project
    // TODO: the check should be unnecessary
    if (owner == null || name == null) throw new Error(`owner (${owner}), name (${name}) required`)
    await navigator.clipboard.writeText(`${location.origin}${getProjectShareRoute(owner, name)}`)
    m.success(t({ en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' }))
  }
}

/**
 * Save and share given project
 * - save current project state
 * - make project public
 * - copy sharing link
 */
export function useSaveAndShareProject() {
  const { t } = useI18n()
  const withConfirm = useConfirmDialog()
  const shareProject = useShareProject()

  async function saveAndShare(project: Project) {
    if (project.isPublic !== IsPublic.public || project.hasUnsyncedChanges) {
      project.setPublic(IsPublic.public)
      await project.saveToCloud()
    }
    await shareProject(project)
  }

  async function saveAndShareWithConfirm(project: Project, confirmMessage: LocaleMessage) {
    await withConfirm({
      title: t({ en: 'Share project', zh: '分享项目' }),
      content: t(confirmMessage),
      confirmHandler: () => saveAndShare(project)
    })
  }

  return async function saveAndShareProject(project: Project) {
    const { isPublic, hasUnsyncedChanges } = project
    if (isPublic == null) throw new Error('isPublic required')

    if (isPublic === IsPublic.public) {
      if (!hasUnsyncedChanges) return saveAndShare(project)
      else
        return saveAndShareWithConfirm(project, {
          en: "To share the project, we will save the project's current state to cloud",
          zh: '分享操作会将当前项目状态保存到云端'
        })
    } else {
      if (!hasUnsyncedChanges)
        return saveAndShareWithConfirm(project, {
          en: 'To share the project, we will make the project public',
          zh: '分享操作会将当前项目设置为公开'
        })
      else
        return saveAndShareWithConfirm(project, {
          en: "To share the project, we will save the project's current state to cloud & make it public",
          zh: '分享操作会将当前项目状态保存到云端，并将项目设置为公开'
        })
    }
  }
}

export function useStopSharingProject() {
  const withConfirm = useConfirmDialog()
  const { t } = useI18n()

  return async function stopSharingProject(project: Project) {
    let confirmMessage = {
      en: 'If sharing stopped, others will no longer have permission to access the project, and all project-sharing links will expire',
      zh: '停止分享后，其他人不再可以访问项目，所有的项目分享链接也将失效'
    }
    if (project.hasUnsyncedChanges) {
      confirmMessage = {
        en: `The project's current state will be saved to cloud. ${confirmMessage.en}`,
        zh: `当前项目状态将被保存到云端；${confirmMessage.zh}`
      }
    }
    return withConfirm({
      title: t({ en: 'Stop sharing project', zh: '停止分享项目' }),
      content: t(confirmMessage),
      confirmHandler: async () => {
        project.setPublic(IsPublic.personal)
        await project.saveToCloud()
      }
    })
  }
}
