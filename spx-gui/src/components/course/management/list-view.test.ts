import { describe, expect, it } from 'vitest'
import {
  getTitleInitial,
  getUpdatedAtPeriod,
  matchesQuery,
  hasSameIDs,
  placeReordered,
  sectionByTitle,
  sectionByUpdatedAt
} from './list-view'

describe('matchesQuery', () => {
  it('matches every word, in any of the texts, ignoring case and full-width forms', () => {
    expect(matchesQuery(['Code Kiko：循环', 'Loops'], 'kiko 循环')).toBe(true)
    expect(matchesQuery(['Code Kiko：循环', 'Loops'], 'kiko loops')).toBe(true)
    expect(matchesQuery(['Ａｂｃ 全角'], 'abc')).toBe(true)
    expect(matchesQuery(['第10课 数组'], '第１０')).toBe(true)
    expect(matchesQuery(['Code Kiko：循环'], 'kiko 函数')).toBe(false)
  })

  it('matches everything with an empty query', () => {
    expect(matchesQuery(['Anything'], '  ')).toBe(true)
  })
})

describe('getTitleInitial', () => {
  it('lists Latin titles under their first letter and Chinese ones under their pinyin initial', () => {
    expect(getTitleInitial('code Kiko')).toBe('C')
    expect(getTitleInitial('Ａｂｃ')).toBe('A')
    expect(getTitleInitial('阿拉丁')).toBe('A')
    expect(getTitleInitial('编程基础')).toBe('B')
    expect(getTitleInitial('第一次运行')).toBe('D')
    expect(getTitleInitial('量一量')).toBe('L')
    expect(getTitleInitial('向左转')).toBe('X')
    expect(getTitleInitial('音乐')).toBe('Y')
  })

  it('lists other titles under "#"', () => {
    expect(getTitleInitial('1. 开始挑战')).toBe('#')
    expect(getTitleInitial('《课程》')).toBe('#')
    expect(getTitleInitial('')).toBe('#')
  })
})

describe('sectionByTitle', () => {
  it('puts Chinese and Latin titles of one initial together, in index order', () => {
    const titles = ['XBuilder 使用', '编程基础', 'Code Hero', '创建项目', '阿拉丁', 'Abc', '1. 开始挑战']

    const sections = sectionByTitle(titles, (t) => t)

    expect(sections.map((s) => [s.key, s.items])).toEqual([
      ['A', ['阿拉丁', 'Abc']],
      ['B', ['编程基础']],
      ['C', ['创建项目', 'Code Hero']],
      ['X', ['XBuilder 使用']],
      ['#', ['1. 开始挑战']]
    ])
  })

  it('sorts numbers in titles by value', () => {
    const sections = sectionByTitle(['第10课', '第2课', '第1课'], (t) => t)

    expect(sections[0].items).toEqual(['第1课', '第2课', '第10课'])
  })
})

describe('sectionByUpdatedAt', () => {
  // Thursday, 15 October 2026, local time
  const now = new Date(2026, 9, 15, 14, 0)

  it('tells the period of a time by local calendar, weeks starting on Monday', () => {
    expect(getUpdatedAtPeriod(new Date(2026, 9, 15, 0, 1), now)).toBe('today')
    expect(getUpdatedAtPeriod(new Date(2026, 9, 12, 9, 0), now)).toBe('thisWeek')
    expect(getUpdatedAtPeriod(new Date(2026, 9, 11, 23, 0), now)).toBe('thisMonth')
    expect(getUpdatedAtPeriod(new Date(2026, 8, 30, 12, 0), now)).toBe('earlier')
  })

  it('lists the latest edited first, in sections by period', () => {
    const items = [
      { id: 'a', updatedAt: new Date(2026, 8, 1).toISOString() },
      { id: 'b', updatedAt: new Date(2026, 9, 15, 9).toISOString() },
      { id: 'c', updatedAt: new Date(2026, 9, 2).toISOString() },
      { id: 'd', updatedAt: new Date(2026, 9, 15, 11).toISOString() }
    ]

    const sections = sectionByUpdatedAt(items, (item) => item.updatedAt, now)

    expect(sections.map((s) => [s.key, s.items.map((item) => item.id)])).toEqual([
      ['today', ['d', 'b']],
      ['thisMonth', ['c']],
      ['earlier', ['a']]
    ])
  })
})

describe('hasSameIDs', () => {
  it('takes the same IDs in another order', () => {
    expect(hasSameIDs(['b', 'a'], ['a', 'b'])).toBe(true)
  })

  it('refuses IDs that repeat one and miss another, as many as expected', () => {
    expect(hasSameIDs(['a', 'a'], ['a', 'b'])).toBe(false)
  })

  it('refuses IDs missing or adding one', () => {
    expect(hasSameIDs(['a'], ['a', 'b'])).toBe(false)
    expect(hasSameIDs(['a', 'b', 'c'], ['a', 'b'])).toBe(false)
  })
})

describe('placeReordered', () => {
  it('puts the reordered items in the places they had, leaving the others in theirs', () => {
    const all = ['g1', 'p1', 'g2', 'p2', 'g3']

    expect(placeReordered(all, ['g3', 'g1', 'g2'], (id) => id)).toEqual(['g3', 'p1', 'g1', 'p2', 'g2'])
  })

  it('refuses items that are not among all items', () => {
    expect(() => placeReordered(['a'], ['x'], (id) => id)).toThrow()
  })
})
