import { h } from 'vue'
import { useModal } from 'naive-ui'
import type { ProjectData } from '@/apis/project'
import { Cancelled } from '@/utils/exception'
import ProjectCreate from './ProjectCreate.vue'
import ProjectList from './ProjectList.vue'
import { useI18n } from '@/utils/i18n'

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
