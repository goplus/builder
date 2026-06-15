import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/zh'

export function initDayjs() {
  dayjs.extend(localizedFormat)
  dayjs.extend(relativeTime)
  dayjs.extend(utc)
  dayjs.extend(timezone)
}
