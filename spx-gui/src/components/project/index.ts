import { h } from 'vue'
import { useModal } from 'naive-ui'
import type { ProjectData } from '@/apis/project'
import { Cancelled } from '@/utils/exception'
import ProjectCreate from './ProjectCreate.vue'
import { useI18n } from '@/utils/i18n'

export function useCreateProject() {
  const modalCtrl = useModal()
  const { t } = useI18n()

  return function createProject() {
    return new Promise<ProjectData>((resolve, reject) => {
      const modal = modalCtrl.create({
        title: t({ en: 'Create a new project', zh: '创建新的项目' }),
        content: () => h(ProjectCreate, {
          onCreated(projectData) {
            modal.destroy()
            resolve(projectData)
          },
          onCancelled() {
            modal.destroy()
            reject(new Cancelled())
          }
        }),
        preset: 'dialog'
      })
    })
  }
}
