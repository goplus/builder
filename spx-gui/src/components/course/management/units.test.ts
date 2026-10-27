import { describe, expect, it } from 'vitest'

import {
  addUnit,
  moveCourseInUnitList,
  moveCourseToUnit,
  moveUnit,
  removeUnit,
  renameUnit,
  splitUnitAt,
  toUnitList
} from './units'

const units = [
  { id: 'u1', title: 'Unit 1', courseIDs: ['a', 'b'] },
  { id: 'u2', title: 'Unit 2', courseIDs: ['c'] },
  { id: 'u3', title: 'Unit 3', courseIDs: [] }
]

/** The units as their titles and courses, to compare without IDs. */
function brief(edited: Array<{ title: string; courseIDs: string[] }>) {
  return edited.map((unit) => `${unit.title}: ${unit.courseIDs.join(' ')}`.trim())
}

describe('unit list', () => {
  it('shows each unit as its header followed by its courses', () => {
    expect(toUnitList(units)).toEqual([
      { type: 'unit', unitIndex: 0 },
      { type: 'course', courseID: 'a' },
      { type: 'course', courseID: 'b' },
      { type: 'unit', unitIndex: 1 },
      { type: 'course', courseID: 'c' },
      { type: 'unit', unitIndex: 2 }
    ])
  })

  it('moves a course within its unit', () => {
    expect(brief(moveCourseInUnitList(units, 2, 1))).toEqual(['Unit 1: b a', 'Unit 2: c', 'Unit 3:'])
  })

  it('moves a course into the unit whose header it is dropped after, empty ones included', () => {
    expect(brief(moveCourseInUnitList(units, 1, 4))).toEqual(['Unit 1: b', 'Unit 2: c a', 'Unit 3:'])
    expect(brief(moveCourseInUnitList(units, 4, 5))).toEqual(['Unit 1: a b', 'Unit 2:', 'Unit 3: c'])
  })

  it('puts a course dropped before every header into the first unit', () => {
    expect(brief(moveCourseInUnitList(units, 4, 0))).toEqual(['Unit 1: c a b', 'Unit 2:', 'Unit 3:'])
  })

  it('keeps unit IDs, and leaves the given units as they are', () => {
    const before = structuredClone(units)
    expect(moveCourseInUnitList(units, 4, 1).map((unit) => unit.id)).toEqual(['u1', 'u2', 'u3'])
    expect(units).toEqual(before)
  })

  it('refuses to move a unit header', () => {
    expect(() => moveCourseInUnitList(units, 3, 0)).toThrow()
  })
})

describe('unit edits', () => {
  it('moves a course to the end of another unit', () => {
    expect(brief(moveCourseToUnit(units, 'a', 1))).toEqual(['Unit 1: b', 'Unit 2: c a', 'Unit 3:'])
  })

  it('splits a unit at a course into a new unit right after it', () => {
    const split = splitUnitAt(units, 'b', 'Unit 1b')
    expect(brief(split)).toEqual(['Unit 1: a', 'Unit 1b: b', 'Unit 2: c', 'Unit 3:'])
    expect(split[1].id).toBeUndefined()
  })

  it('puts all courses into the first unit of a series, and adds later units empty', () => {
    expect(addUnit([], 'Unit 1', ['a', 'b'])).toEqual([{ title: 'Unit 1', courseIDs: ['a', 'b'] }])
    expect(brief(addUnit(units, 'Unit 4', ['a', 'b', 'c']))).toEqual(['Unit 1: a b', 'Unit 2: c', 'Unit 3:', 'Unit 4:'])
  })

  it('merges the courses of a removed unit into the unit before it, or after it for the first unit', () => {
    expect(brief(removeUnit(units, 1))).toEqual(['Unit 1: a b c', 'Unit 3:'])
    expect(brief(removeUnit(units, 0))).toEqual(['Unit 2: a b c', 'Unit 3:'])
  })

  it('leaves the series undivided when its only unit is removed', () => {
    expect(removeUnit([units[0]], 0)).toEqual([])
  })

  it('moves a unit with its courses', () => {
    expect(brief(moveUnit(units, 1, -1))).toEqual(['Unit 2: c', 'Unit 1: a b', 'Unit 3:'])
    expect(moveUnit(units, 2, 1)).toBe(units)
  })

  it('renames a unit', () => {
    expect(brief(renameUnit(units, 2, 'Review'))).toEqual(['Unit 1: a b', 'Unit 2: c', 'Review:'])
  })
})
