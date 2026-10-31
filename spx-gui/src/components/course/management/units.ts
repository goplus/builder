/**
 * Edits to the units of a course series. Units are contiguous runs of the series' courses: every course is in exactly
 * one unit, and the courses of the units, joined in unit order, are the series' courses in order. Each edit here keeps
 * it so, and returns the units to write, leaving the given ones as they are.
 */

import type { CourseSeriesUnitParams, UpdateCourseSeriesParams } from '@/apis/course-series'

/**
 * The fields that write the units. Divided into them, the series takes their courses, joined in unit order, as its
 * courses; left undivided, it keeps its courses.
 */
export function toUnitsParams(units: CourseSeriesUnitParams[]): Pick<UpdateCourseSeriesParams, 'units' | 'courseIDs'> {
  if (units.length === 0) return { units }
  return { units, courseIDs: units.flatMap((unit) => unit.courseIDs) }
}

/** An item of the list that shows the units in order, each as its header followed by its courses. */
export type UnitListItem = { type: 'unit'; unitIndex: number } | { type: 'course'; courseID: string }

export function toUnitList(units: CourseSeriesUnitParams[]): UnitListItem[] {
  return units.flatMap((unit, unitIndex) => [
    { type: 'unit' as const, unitIndex },
    ...unit.courseIDs.map((courseID) => ({ type: 'course' as const, courseID }))
  ])
}

/**
 * Move the course at `oldIndex` of the unit list to `newIndex`. A course belongs to the unit whose header comes before
 * it; one put before every header goes to the first unit.
 */
export function moveCourseInUnitList(units: CourseSeriesUnitParams[], oldIndex: number, newIndex: number) {
  const list = toUnitList(units)
  const [moved] = list.splice(oldIndex, 1)
  if (moved?.type !== 'course') throw new Error(`no course at ${oldIndex} of the unit list`)
  list.splice(newIndex, 0, moved)
  const result = units.map((unit) => ({ ...unit, courseIDs: [] as string[] }))
  const leading: string[] = []
  let current: string[] = leading
  for (const item of list) {
    if (item.type === 'unit') current = result[item.unitIndex].courseIDs
    else current.push(item.courseID)
  }
  if (result.length > 0) result[0].courseIDs.unshift(...leading)
  return result
}

/** Move a course to the end of the unit at `unitIndex`. */
export function moveCourseToUnit(units: CourseSeriesUnitParams[], courseID: string, unitIndex: number) {
  return units.map((unit, index) => {
    const courseIDs = unit.courseIDs.filter((id) => id !== courseID)
    return { ...unit, courseIDs: index === unitIndex ? [...courseIDs, courseID] : courseIDs }
  })
}

/** Split the unit holding the course: the course and those after it in the unit become a new unit, right after. */
export function splitUnitAt(units: CourseSeriesUnitParams[], courseID: string, title: string) {
  return units.flatMap((unit) => {
    const index = unit.courseIDs.indexOf(courseID)
    if (index < 0) return [unit]
    return [
      { ...unit, courseIDs: unit.courseIDs.slice(0, index) },
      { title, courseIDs: unit.courseIDs.slice(index) }
    ]
  })
}

/**
 * Add a unit with `title`. The first unit of a series holds all its courses, `courseIDs`; a later one is added empty,
 * at the end.
 */
export function addUnit(units: CourseSeriesUnitParams[], title: string, courseIDs: string[]) {
  if (units.length === 0) return [{ title, courseIDs }]
  return [...units, { title, courseIDs: [] }]
}

/**
 * Remove the unit at `unitIndex`. Its courses join the unit before it, or the one after it for the first unit, and keep
 * their order; removing the only unit leaves the series undivided.
 */
export function removeUnit(units: CourseSeriesUnitParams[], unitIndex: number) {
  if (units.length <= 1) return []
  const { courseIDs } = units[unitIndex]
  const intoIndex = unitIndex === 0 ? 1 : unitIndex - 1
  return units.flatMap((unit, index) => {
    if (index === unitIndex) return []
    if (index !== intoIndex) return [unit]
    return [
      {
        ...unit,
        courseIDs: intoIndex < unitIndex ? [...unit.courseIDs, ...courseIDs] : [...courseIDs, ...unit.courseIDs]
      }
    ]
  })
}

/** Move the unit at `unitIndex`, with its courses, `offset` places later (or earlier, if negative). */
export function moveUnit(units: CourseSeriesUnitParams[], unitIndex: number, offset: number) {
  const newIndex = unitIndex + offset
  if (newIndex < 0 || newIndex >= units.length) return units
  const moved = [...units]
  const [unit] = moved.splice(unitIndex, 1)
  moved.splice(newIndex, 0, unit)
  return moved
}

export function renameUnit(units: CourseSeriesUnitParams[], unitIndex: number, title: string) {
  return units.map((unit, index) => (index === unitIndex ? { ...unit, title } : unit))
}
