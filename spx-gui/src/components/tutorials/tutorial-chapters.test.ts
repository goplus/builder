import { describe, expect, it } from 'vitest'
import type { CourseSeries } from '@/apis/course-series'
import { getTutorialChapter, getTutorialChapters } from './tutorial-chapters'

const litaSeries = { id: 'lita-course', title: 'Lita course' } as CourseSeries

describe('tutorial chapters', () => {
  it('returns the prototype chapters only for the Lita series', () => {
    const chapters = getTutorialChapters(litaSeries)
    expect(chapters).toHaveLength(10)
    expect(chapters[0]?.shortTitle.zh).toBe('单元一')
    expect(getTutorialChapters({ ...litaSeries, id: 'other', title: 'Other' })).toEqual([])
  })

  it('places boundary courses in the correct chapter', () => {
    const chapters = getTutorialChapters(litaSeries)
    expect(getTutorialChapter(chapters, 13)?.number).toBe(1)
    expect(getTutorialChapter(chapters, 14)?.number).toBe(2)
    expect(getTutorialChapter(chapters, 66)?.number).toBe(10)
    expect(getTutorialChapter(chapters, 67)).toBeNull()
  })
})
