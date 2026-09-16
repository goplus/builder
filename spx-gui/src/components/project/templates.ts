import type { ViewportSize } from '@/models/spx/project'
import type { LocaleMessage } from '@/utils/i18n'

export type ProjectTemplateId = 'classic' | 'landscape' | 'portrait'

export type ProjectTemplate = {
  id: ProjectTemplateId
  name: LocaleMessage
  viewportSize: ViewportSize
}

export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'classic',
    name: { en: 'Landscape 4:3', zh: '横版 4:3' },
    viewportSize: { width: 480, height: 360 }
  },
  {
    id: 'landscape',
    name: { en: 'Landscape 16:9', zh: '横版 16:9' },
    viewportSize: { width: 720, height: 405 }
  },
  {
    id: 'portrait',
    name: { en: 'Portrait', zh: '竖版' },
    viewportSize: { width: 620, height: 900 }
  }
]

export function getProjectTemplate(id: ProjectTemplateId) {
  const template = projectTemplates.find((item) => item.id === id)
  if (template == null) throw new Error(`Unknown project template: ${id}`)
  return template
}
