import type { LocaleMessage } from '@/utils/i18n'
import type { ViewportSize } from '@/models/spx/project'

export type DemoProjectTemplateId = 'classic' | 'landscape' | 'portrait'

export type DemoProjectTemplate = {
  id: DemoProjectTemplateId
  name: LocaleMessage
  description: LocaleMessage
  orientation: 'landscape' | 'portrait'
  viewportSize: ViewportSize
}

export const demoProjectTemplates: DemoProjectTemplate[] = [
  {
    id: 'classic',
    name: { en: 'Classic blank 4:3', zh: '经典空白 4:3' },
    description: { en: 'Start with the original game canvas.', zh: '使用原有游戏画面开始创作。' },
    orientation: 'landscape',
    viewportSize: { width: 480, height: 360 }
  },
  {
    id: 'landscape',
    name: { en: 'Landscape blank 16:9', zh: '横版空白 16:9' },
    description: { en: 'For games designed around a wide view.', zh: '适合以宽阔视野展开的游戏。' },
    orientation: 'landscape',
    viewportSize: { width: 720, height: 405 }
  },
  {
    id: 'portrait',
    name: { en: 'Portrait blank 9:16', zh: '竖版空白 9:16' },
    description: { en: 'For games designed around a tall view.', zh: '适合以纵向视野展开的游戏。' },
    orientation: 'portrait',
    viewportSize: { width: 360, height: 640 }
  }
]

export function getDemoProjectTemplate(id: DemoProjectTemplateId) {
  const template = demoProjectTemplates.find((item) => item.id === id)
  if (template == null) throw new Error(`Unknown demo project template: ${id}`)
  return template
}
