import { useRouter } from 'vue-router'
import { useModal, useConfirmDialog } from '@/components/ui'
import { IsPublic, type ProjectData } from '@/apis/project'
import { useMessageHandle } from '@/utils/exception'
import ProjectCreateModal from './ProjectCreateModal.vue'
import ProjectOpenModal from './ProjectOpenModal.vue'
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import type { Project } from '@/models/project'
import { getProjectEditorRoute, getProjectShareRoute } from '@/router'

export function useCreateProject() {
  const modal = useModal(ProjectCreateModal)

  return function createProject() {
    return modal({}) as Promise<ProjectData>
  }
}

export function useOpenProject() {
  const router = useRouter()
  const modal = useModal(ProjectOpenModal)

  return async function openProject() {
    const project = await (modal({}) as Promise<ProjectData>)
    router.push(getProjectEditorRoute(project.name))
  }
}

async function copySharingLink(project: Project) {
  const { owner, name } = project
  // TODO: the check should be unnecessary
  if (owner == null || name == null) throw new Error(`owner (${owner}), name (${name}) required`)
  await navigator.clipboard.writeText(`${location.origin}${getProjectShareRoute(owner, name)}`)
}

/** Copy sharing link for given project */
export function useShareProject() {
  return useMessageHandle(
    copySharingLink,
    { en: 'Failed to get link for sharing', zh: '获取分享链接失败' },
    { en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' }
  ).fn
}

/**
 * Save and share given project
 * - save current project state
 * - make project public
 * - copy sharing link
 */
export function useSaveAndShareProject() {
  const withConfirm = useConfirmDialog()
  const { t } = useI18n()

  const saveAndShare = useMessageHandle(
    async (project: Project) => {
      if (project.isPublic !== IsPublic.public) project.setPublic(IsPublic.public)
      if (project.hasUnsyncedChanges) await project.saveToCloud()
      await copySharingLink(project)
    },
    { en: 'Failed to get link for sharing', zh: '获取分享链接失败' },
    { en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' }
  ).fn

  return async function saveAndShareProject(project: Project) {
    const { isPublic, hasUnsyncedChanges } = project
    if (isPublic == null) throw new Error('isPublic required')

    if (isPublic === IsPublic.public) {
      if (!hasUnsyncedChanges) return shareWithConfirm(null)
      else
        return shareWithConfirm({
          en: "To share the project, we will save the project's current state to cloud",
          zh: '分享操作会将当前项目状态保存到云端'
        })
    } else {
      if (!hasUnsyncedChanges)
        return shareWithConfirm({
          en: 'To share the project, we will make the project public',
          zh: '分享操作会将当前项目设置为公开'
        })
      else
        return shareWithConfirm({
          en: "To share the project, we will save the project's current state to cloud & make it public",
          zh: '分享操作会将当前项目状态保存到云端，并将项目设置为公开'
        })
    }

    async function shareWithConfirm(confirmMessage: LocaleMessage | null) {
      if (confirmMessage == null) return saveAndShare(project)
      await withConfirm({
        title: t({ en: 'Share project', zh: '分享项目' }),
        content: t(confirmMessage),
        confirmHandler: () => saveAndShare(project)
      })
    }
  }
}

export function useStopSharingProject() {
  const withConfirm = useConfirmDialog()
  const { t } = useI18n()

  const doStopSharingProject = useMessageHandle(
    async (project: Project) => {
      project.setPublic(IsPublic.personal)
      await project.saveToCloud()
    },
    { en: 'Failed to stop sharing project', zh: '未成功停止分享项目' },
    { en: 'Project sharing is now stopped', zh: '项目已停止分享' }
  ).fn

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
      confirmHandler: () => doStopSharingProject(project)
    })
  }
}
