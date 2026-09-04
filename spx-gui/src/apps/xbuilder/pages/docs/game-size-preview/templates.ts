import type { LocaleMessage } from '@/utils/i18n'
import type { ViewportSize } from '@/models/spx/project'

export type DemoProjectTemplateId = 'classic' | 'landscape' | 'portrait'

export type DemoProjectTemplate = {
  id: DemoProjectTemplateId
  name: LocaleMessage
  orientation: 'landscape' | 'portrait'
  viewportSize: ViewportSize
}

export const demoProjectTemplates: DemoProjectTemplate[] = [
  {
    id: 'classic',
    name: { en: 'Landscape 4:3', zh: '横版 4:3' },
    orientation: 'landscape',
    viewportSize: { width: 480, height: 360 }
  },
  {
    id: 'landscape',
    name: { en: 'Landscape 16:9', zh: '横版 16:9' },
    orientation: 'landscape',
    viewportSize: { width: 720, height: 405 }
  },
  {
    id: 'portrait',
    name: { en: 'Portrait', zh: '竖版' },
    orientation: 'portrait',
    viewportSize: { width: 620, height: 900 }
  }
]

export function getDemoProjectTemplate(id: DemoProjectTemplateId) {
  const template = demoProjectTemplates.find((item) => item.id === id)
  if (template == null) throw new Error(`Unknown demo project template: ${id}`)
  return template
}
