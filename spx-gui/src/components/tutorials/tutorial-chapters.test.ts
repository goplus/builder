import { describe, expect, it } from 'vitest'
import type { CourseSeries } from '@/apis/course-series'
import { getTutorialChapter, getTutorialChapters } from './tutorial-chapters'

const litaSeries = { id: 'lita-course', title: 'Lita course' } as CourseSeries

describe('tutorial chapters', () => {
  it('returns the configured chapters only for the Lita series', () => {
    const chapters = getTutorialChapters(litaSeries)
    expect(chapters).toHaveLength(10)
    expect(chapters[0]?.shortTitle.zh).toBe('单元一')
    expect(chapters.map(({ start, end }) => [start, end])).toEqual([
      [1, 13],
      [14, 18],
      [19, 23],
      [24, 30],
      [31, 42],
      [43, 53],
      [54, 59],
      [60, 65],
      [66, 69],
      [70, 70]
    ])
    expect(getTutorialChapters({ ...litaSeries, id: 'other', title: 'Other' })).toEqual([])
  })

  it('places boundary courses in the correct chapter', () => {
    const chapters = getTutorialChapters(litaSeries)
    expect(getTutorialChapter(chapters, 13)?.number).toBe(1)
    expect(getTutorialChapter(chapters, 14)?.number).toBe(2)
    expect(getTutorialChapter(chapters, 30)?.number).toBe(4)
    expect(getTutorialChapter(chapters, 31)?.number).toBe(5)
    expect(getTutorialChapter(chapters, 42)?.number).toBe(5)
    expect(getTutorialChapter(chapters, 43)?.number).toBe(6)
    expect(getTutorialChapter(chapters, 53)?.number).toBe(6)
    expect(getTutorialChapter(chapters, 54)?.number).toBe(7)
    expect(getTutorialChapter(chapters, 59)?.number).toBe(7)
    expect(getTutorialChapter(chapters, 60)?.number).toBe(8)
    expect(getTutorialChapter(chapters, 65)?.number).toBe(8)
    expect(getTutorialChapter(chapters, 66)?.number).toBe(9)
    expect(getTutorialChapter(chapters, 69)?.number).toBe(9)
    expect(getTutorialChapter(chapters, 70)?.number).toBe(10)
    expect(getTutorialChapter(chapters, 71)).toBeNull()
  })
})
