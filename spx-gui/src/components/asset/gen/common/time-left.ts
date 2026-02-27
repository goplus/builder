import type { LocaleMessage } from '@/utils/i18n'
import dayjs from 'dayjs'

export function humanizeTimeLeft(ms: number): LocaleMessage {
  const t = dayjs().add(ms, 'millisecond')
  // TODO: the parentheses should not be hardcoded here
  return {
    en: `(ETA: ${t.locale('en').fromNow()})`,
    zh: `（预计完成时间：${t.locale('zh').fromNow()}）`
  }
}
