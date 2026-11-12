/**
 * Finding things in long lists of course series or courses: matching a search, sorting, and dividing a sorted list
 * into the sections a side index jumps between.
 */

import type { LocaleMessage } from '@/utils/i18n'

export type ListSortBy = 'order' | 'title' | 'updatedAt'

export type ListSection<T> = {
  key: string
  label: LocaleMessage
  items: T[]
}

/** An entry of the side index, which jumps to the section of the same key. */
export type ListIndexEntry = {
  key: string
  label: LocaleMessage
}

function normalize(text: string) {
  // NFKC folds full-width forms, so that "ａｂｃ" is found by "abc".
  return text.normalize('NFKC').toLowerCase()
}

/** Whether `texts` hold every word of `query` between them; an empty query matches everything. */
export function matchesQuery(texts: string[], query: string) {
  const words = normalize(query)
    .split(/\s+/)
    .filter((word) => word !== '')
  const normalizedTexts = texts.map(normalize)
  return words.every((word) => normalizedTexts.some((text) => text.includes(word)))
}

// Titles are sorted the same whatever the UI language, as their own language is not known: Chinese by pinyin, numbers
// by value ("2" before "10"), case and full-width forms ignored.
const titleCollator = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' })

/** The first character, in pinyin order, read with each initial; no syllable starts with "i", "u" or "v". */
const pinyinInitialBounds: Array<[initial: string, firstCharacter: string]> = [
  ['A', '阿'],
  ['B', '八'],
  ['C', '嚓'],
  ['D', '哒'],
  ['E', '妸'],
  ['F', '发'],
  ['G', '旮'],
  ['H', '哈'],
  ['J', '讥'],
  ['K', '咔'],
  ['L', '垃'],
  ['M', '妈'],
  ['N', '拏'],
  ['O', '噢'],
  ['P', '妑'],
  ['Q', '七'],
  ['R', '呥'],
  ['S', '仨'],
  ['T', '他'],
  ['W', '屲'],
  ['X', '夕'],
  ['Y', '丫'],
  ['Z', '帀']
]

const otherInitial = '#'

export const titleIndex: ListIndexEntry[] = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', otherInitial].map((key) => ({
  key,
  label: { en: key, zh: key }
}))

/**
 * The letter a title is listed under: its first letter if Latin, the initial of its pinyin if Chinese, or "#". The
 * pinyin is that of the first character alone, so a character with several readings may be listed under another one
 * ("重复" under "Z").
 *
 * TODO: List titles in other scripts, such as Japanese kana or Korean Hangul, under their own index, rather than "#".
 */
export function getTitleInitial(title: string) {
  const first = title.normalize('NFKC').trim().charAt(0)
  if (/[a-z]/i.test(first)) return first.toUpperCase()
  if (!/\p{Script=Han}/u.test(first)) return otherInitial
  let initial = otherInitial
  for (const [letter, bound] of pinyinInitialBounds) {
    if (titleCollator.compare(first, bound) < 0) break
    initial = letter
  }
  return initial
}

/** `items` by title, in sections by initial (see `getTitleInitial`) in index order. */
export function sectionByTitle<T>(items: T[], getTitle: (item: T) => string): ListSection<T>[] {
  const byInitial = new Map<string, T[]>()
  for (const item of items) {
    const initial = getTitleInitial(getTitle(item))
    const sectionItems = byInitial.get(initial)
    if (sectionItems == null) byInitial.set(initial, [item])
    else sectionItems.push(item)
  }
  return titleIndex.flatMap(({ key, label }) => {
    const sectionItems = byInitial.get(key)
    if (sectionItems == null) return []
    return [{ key, label, items: sectionItems.sort((a, b) => titleCollator.compare(getTitle(a), getTitle(b))) }]
  })
}

export const updatedAtIndex: ListIndexEntry[] = [
  { key: 'today', label: { en: 'Today', zh: '今天' } },
  { key: 'thisWeek', label: { en: 'This week', zh: '本周' } },
  { key: 'thisMonth', label: { en: 'This month', zh: '本月' } },
  { key: 'earlier', label: { en: 'Earlier', zh: '更早' } }
]

/** Which period a time in milliseconds falls in, from `now`: the periods' starts are worked out once for all times. */
function getUpdatedAtPeriodAt(now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  return (time: number) => {
    if (time >= today.getTime()) return 'today'
    if (time >= weekStart.getTime()) return 'thisWeek'
    if (time >= monthStart.getTime()) return 'thisMonth'
    return 'earlier'
  }
}

/** Which period, as the side index names them, `time` falls in, by local calendar, weeks starting on Monday. */
export function getUpdatedAtPeriod(time: Date, now: Date) {
  return getUpdatedAtPeriodAt(now)(time.getTime())
}

/** `items` from the latest edited, in sections by when they were edited. */
export function sectionByUpdatedAt<T>(
  items: T[],
  getUpdatedAt: (item: T) => string,
  now = new Date()
): ListSection<T>[] {
  const periodOf = getUpdatedAtPeriodAt(now)
  const dated = items.map((item) => ({ item, time: Date.parse(getUpdatedAt(item)) })).sort((a, b) => b.time - a.time)
  const byPeriod = new Map<string, T[]>()
  for (const { item, time } of dated) {
    const period = periodOf(time)
    const sectionItems = byPeriod.get(period)
    if (sectionItems == null) byPeriod.set(period, [item])
    else sectionItems.push(item)
  }
  return updatedAtIndex.flatMap(({ key, label }) => {
    const sectionItems = byPeriod.get(key)
    return sectionItems == null ? [] : [{ key, label, items: sectionItems }]
  })
}

/**
 * `all` with the items of `reordered`, some of them in a new order, put in the places those items had; the others keep
 * theirs. This is how a list shown in part, by a filter or a search, is reordered.
 */
export function placeReordered<T>(all: T[], reordered: T[], getID: (item: T) => string): T[] {
  const reorderedIDs = new Set(reordered.map(getID))
  const placed = [...all]
  let next = 0
  for (const [index, item] of all.entries()) {
    if (!reorderedIDs.has(getID(item))) continue
    placed[index] = reordered[next++]
  }
  if (next !== reordered.length) throw new Error('Reordered items must be among all items')
  return placed
}
