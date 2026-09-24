import { describe, expect, it } from 'vitest'
import type { CourseSeries } from '@/apis/course-series'
import { getTutorialChapter, getTutorialChapters, getTutorialSeriesDescription } from './tutorial-chapters'

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
      [43, 56],
      [57, 62],
      [63, 68],
      [69, 71],
      [72, 72]
    ])
    expect(getTutorialChapters({ ...litaSeries, id: 'other', title: 'Other' })).toEqual([])
  })

  it('covers all 72 courses exactly once', () => {
    const chapters = getTutorialChapters(litaSeries)
    const sequences = chapters.flatMap((chapter) =>
      Array.from({ length: chapter.end - chapter.start + 1 }, (_, index) => chapter.start + index)
    )

    expect(sequences).toEqual(Array.from({ length: 72 }, (_, index) => index + 1))
  })

  it('uses the updated Code: Lita description without changing other series', () => {
    expect(getTutorialSeriesDescription(litaSeries)).toBe(
      'Lita 来到一片充满变化的森林，为即将到来的冬天收集松果、蘑菇和各种果实。一路上，她会遇到不同的挑战和竞争对手，也会得到新朋友的帮助。通过代码学习，Lita 将学会规划路线、控制小船、判断目标、记录收获、整理物资，并逐步完成一场充满探索与挑战的森林冒险，迎来属于自己的大丰收。'
    )
    expect(
      getTutorialSeriesDescription({ ...litaSeries, id: 'other', title: 'Other', description: 'Other text' })
    ).toBe('Other text')
  })

  it('places boundary courses in the correct chapter', () => {
    const chapters = getTutorialChapters(litaSeries)
    expect(getTutorialChapter(chapters, 13)?.number).toBe(1)
    expect(getTutorialChapter(chapters, 14)?.number).toBe(2)
    expect(getTutorialChapter(chapters, 30)?.number).toBe(4)
    expect(getTutorialChapter(chapters, 31)?.number).toBe(5)
    expect(getTutorialChapter(chapters, 42)?.number).toBe(5)
    expect(getTutorialChapter(chapters, 43)?.number).toBe(6)
    expect(getTutorialChapter(chapters, 56)?.number).toBe(6)
    expect(getTutorialChapter(chapters, 57)?.number).toBe(7)
    expect(getTutorialChapter(chapters, 62)?.number).toBe(7)
    expect(getTutorialChapter(chapters, 63)?.number).toBe(8)
    expect(getTutorialChapter(chapters, 68)?.number).toBe(8)
    expect(getTutorialChapter(chapters, 69)?.number).toBe(9)
    expect(getTutorialChapter(chapters, 71)?.number).toBe(9)
    expect(getTutorialChapter(chapters, 72)?.number).toBe(10)
    expect(getTutorialChapter(chapters, 73)).toBeNull()
  })
})
