import { describe, expect, it } from 'vitest'

import type { CourseSeries } from '@/apis/course-series'
import {
  findUnitIndexOfCourse,
  getCourseSeriesPageRouteOfCourse,
  getSeriesUnits,
  getUnitHeading,
  getUnitLabel,
  toChineseNumeral
} from './units'

function makeSeries(courseIDs: string[], units: CourseSeries['units'] = []) {
  return { id: '39', courseIDs, units } as CourseSeries
}

describe('series units as learners see them', () => {
  it('sees a series not divided into units as one untitled unit', () => {
    expect(getSeriesUnits(makeSeries(['a', 'b']))).toEqual([{ title: null, courseIDs: ['a', 'b'] }])
  })

  it('leaves out units without courses', () => {
    const series = makeSeries(
      ['a', 'b'],
      [
        { id: 'u1', title: 'Unit 1', courseIDs: ['a'] },
        { id: 'u2', title: 'Unit 2', courseIDs: [] },
        { id: 'u3', title: 'Unit 3', courseIDs: ['b'] }
      ]
    )
    const units = getSeriesUnits(series)
    expect(units.map((unit) => unit.title)).toEqual(['Unit 1', 'Unit 3'])
    expect(findUnitIndexOfCourse(units, 'b')).toBe(1)
    expect(findUnitIndexOfCourse(units, 'x')).toBe(-1)
    expect(getCourseSeriesPageRouteOfCourse(series, 'b')).toBe('/course-series/39?unit=2')
    expect(getCourseSeriesPageRouteOfCourse(series, 'a')).toBe('/course-series/39')
  })

  it('numbers units in Chinese', () => {
    expect([1, 9, 10, 11, 20, 21, 99].map(toChineseNumeral)).toEqual([
      '一',
      '九',
      '十',
      '十一',
      '二十',
      '二十一',
      '九十九'
    ])
    expect(getUnitLabel(9)).toEqual({ en: 'Unit 10', zh: '单元十' })
    expect(getUnitHeading(0, 'Moving')).toEqual({ en: '1. Moving', zh: '一、Moving' })
  })
})
