import { h } from 'vue'
import { useModal, useDialog } from 'naive-ui'
import { IsPublic, type ProjectData } from '@/apis/project'
import { Cancelled, useMessageHandle } from '@/utils/exception'
import ProjectCreate from './ProjectCreate.vue'
import ProjectList from './ProjectList.vue'
import { useI18n } from '@/utils/i18n'
import type { Project } from '@/models/project'
import { getProjectShareRoute } from '@/router'

export function useCreateProject() {
  const modalCtrl = useModal()
  const { t } = useI18n()

  return function createProject() {
    return new Promise<ProjectData>((resolve, reject) => {
      const modal = modalCtrl.create({
        title: t({ en: 'Create a new project', zh: '创建新的项目' }),
        content: () =>
          h(ProjectCreate, {
            onCreated(projectData) {
              resolve(projectData)
              modal.destroy()
            },
            onCancelled() {
              reject(new Cancelled())
              modal.destroy()
            }
          }),
        preset: 'dialog',
        onHide() {
          reject(new Cancelled())
          modal.destroy()
        }
      })
    })
  }
}

export function useChooseProject() {
  const modalCtrl = useModal()
  const { t } = useI18n()

  return function chooseProject() {
    return new Promise<ProjectData>((resolve, reject) => {
      const modal = modalCtrl.create({
        title: t({ en: 'Choose a project', zh: '选择一个项目' }),
        content: () =>
          h(ProjectList, {
            onSelected(projectData) {
              resolve(projectData)
              modal.destroy()
            }
          }),
        preset: 'dialog',
        onHide() {
          reject(new Cancelled())
          modal.destroy()
        }
      })
    })
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
    { en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' },
  )
}

/**
 * Save and share given project
 * - save current project state
 * - make project public
 * - copy sharing link
 */
export function useSaveAndShareProject() {
  const dialog = useDialog()
  const { t } = useI18n()

  const saveAndShare = useMessageHandle(
    async (project: Project) => {
      project.setPublic(IsPublic.public)
      await project.saveToCloud()
      await copySharingLink(project)
    },
    { en: 'Failed to get link for sharing', zh: '获取分享链接失败' },
    { en: 'Link copied to clipboard', zh: '分享链接已复制到剪贴板' },
  )

  return function saveAndShareProject(project: Project) {
    return new Promise<void>((resolve, reject) => {

      // TODO: the check should be unnecessary
      if (project.isPublic == null) {
        reject(new Error('isPublic required'))
        return
      }

      // TODO: check if current state is already synced to cloud,
      // if so, skip the confirm dialog
      dialog.warning({
        title: t({ en: 'Share project', zh: '分享项目' }),
        content: t(getShareHintMessage(project.isPublic)),
        positiveText: t({ en: 'OK', zh: '确认' }),
        negativeText: t({ en: 'Cancel', zh: '取消' }),
        async onPositiveClick() {
          await saveAndShare(project)
          resolve()
        },
        onNegativeClick() {
          reject(new Cancelled())
        }
      })
    })
  }
}

function getShareHintMessage(isPublic: IsPublic) {
  if (isPublic === IsPublic.personal) return {
    en: 'To share the peoject, we will save the project\'s current state to cloud & make it public',
    zh: '分享操作会将当前项目状态保存到云端，并将项目设置为公开'
  }
  return {
    en: 'To share the peoject, we will save the project\'s current state to cloud',
    zh: '分享操作会将当前项目状态保存到云端'
  }
}

export function useStopSharingProject() {
  const dialog = useDialog()
  const { t } = useI18n()

  const doStopSharingProject = useMessageHandle(
    async (project: Project) => {
      project.setPublic(IsPublic.personal)
      await project.saveToCloud()
    },
    { en: 'Failed to stop sharing project', zh: '未成功停止共享项目' },
    { en: 'Project sharing is now stopped', zh: '项目已停止共享' },
  )

  return function stopSharingProject(project: Project) {
    return new Promise<void>((resolve, reject) => {

      // TODO: the check should be unnecessary
      if (project.isPublic == null) {
        reject(new Error('isPublic required'))
        return
      }

      // TODO: check if current state is already synced to cloud,
      // if so, skip the confirm dialog
      dialog.warning({
        title: t({ en: 'Stop sharing project', zh: '停止共享项目' }),
        content: t({
          en: 'If project-sharing stopped, others will no longer have permission to access the project, and all project-sharing links will expire',
          zh: '项目停止共享后，其他人不再可以访问项目，所有的项目分享链接也将失效'
        }),
        positiveText: t({ en: 'OK', zh: '确认' }),
        negativeText: t({ en: 'Cancel', zh: '取消' }),
        async onPositiveClick() {
          await doStopSharingProject(project)
          resolve()
        },
        onNegativeClick() {
          reject(new Cancelled())
        }
      })
    })
  }
}