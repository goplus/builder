import type { CourseSeries } from '@/apis/course-series'
import { getCourseSeriesPageRoute } from '@/apps/xbuilder/router'
import type { LocaleMessage } from '@/utils/i18n'

/**
 * A unit of a course series as learners see it. A series not divided into units is seen as one unit without a title,
 * for which no tab or heading is shown.
 */
export type SeriesUnit = {
  title: string | null
  courseIDs: string[]
}

/** The units learners see, in order: those without courses are left out. */
export function getSeriesUnits(series: CourseSeries): SeriesUnit[] {
  if (series.units.length === 0) return [{ title: null, courseIDs: series.courseIDs }]
  return series.units.filter((unit) => unit.courseIDs.length > 0)
}

/** The index of the unit holding the course, or -1 if none does. */
export function findUnitIndexOfCourse(units: SeriesUnit[], courseID: string) {
  return units.findIndex((unit) => unit.courseIDs.includes(courseID))
}

/** The route of the series page, showing the unit that holds the course. */
export function getCourseSeriesPageRouteOfCourse(series: CourseSeries, courseID: string) {
  return getCourseSeriesPageRoute(series.id, Math.max(findUnitIndexOfCourse(getSeriesUnits(series), courseID), 0))
}

const chineseDigits = '零一二三四五六七八九'

/** The Chinese numeral for `n`, for 1 to 99. */
export function toChineseNumeral(n: number) {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n)
  const tens = Math.floor(n / 10)
  const ones = n % 10
  if (tens === 0) return chineseDigits[ones]
  return (tens === 1 ? '' : chineseDigits[tens]) + '十' + (ones === 0 ? '' : chineseDigits[ones])
}

/** The tab label of the unit at `index`, such as "Unit 1". */
export function getUnitLabel(index: number): LocaleMessage {
  return { en: `Unit ${index + 1}`, zh: `单元${toChineseNumeral(index + 1)}` }
}

/** The heading of the unit at `index`: its title, numbered. */
export function getUnitHeading(index: number, title: string): LocaleMessage {
  return { en: `${index + 1}. ${title}`, zh: `${toChineseNumeral(index + 1)}、${title}` }
}
