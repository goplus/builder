import type { LocaleMessage } from '@/utils/i18n'
import dayjs from 'dayjs'

export function humanizeRemaining(seconds: number): LocaleMessage {
  const t = dayjs().add(seconds, 'second')
  // TODO: the parentheses should not be hardcoded here
  return {
    en: `(ETA: ${t.locale('en').fromNow()})`,
    zh: `（预计完成时间：${t.locale('zh').fromNow()}）`
  }
}
