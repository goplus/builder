import type { LocaleMessage } from '@/utils/i18n'
import type { CourseKind } from '@/apis/course'

export const courseKindNames: Record<CourseKind, LocaleMessage> = {
  guided: { en: 'Guided', zh: '引导式' },
  playground: { en: 'Playground', zh: '目标式' }
}
