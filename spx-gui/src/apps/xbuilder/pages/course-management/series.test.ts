import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { isNavigationFailure } from 'vue-router'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import * as courseApis from '@/apis/course'
import * as courseSeriesApis from '@/apis/course-series'
import type { CourseSeries, CourseSeriesUnit, UpdateCourseSeriesParams } from '@/apis/course-series'

function makeCourse(id: string, title: string): courseApis.Course {
  return {
    id,
    owner: 'alice',
    kind: 'guided',
    title,
    thumbnail: 'data:image/png;base64,',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    content: { entrypoint: `/editor/alice/${id}`, prompt: 'Build a spaceship' }
  }
}

/** A series in two units, whose writes are answered when the test says. */
function serveSeries() {
  const units: CourseSeriesUnit[] = [
    { id: 'basics', title: 'Basics', courseIDs: ['first-flight'] },
    { id: 'arrival', title: 'Arrival', courseIDs: ['landing'] }
  ]
  let series: CourseSeries = {
    id: 'space',
    owner: 'alice',
    kind: 'guided',
    title: 'Space adventures',
    description: '',
    thumbnail: '',
    courseIDs: units.flatMap((unit) => unit.courseIDs),
    units,
    order: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
  const courses = [makeCourse('first-flight', 'First flight'), makeCourse('landing', 'Landing')]
  vi.mocked(courseSeriesApis.getCourseSeries).mockImplementation(async () => series)
  vi.mocked(courseApis.listAllSeriesCourses).mockImplementation(async () =>
    series.courseIDs.map((id) => courses.find((course) => course.id === id)!)
  )
  let unitCount = 0
  const writes: Array<{ params: UpdateCourseSeriesParams; answer: (ok?: boolean) => Promise<void> }> = []
  vi.mocked(courseSeriesApis.updateCourseSeries).mockImplementation(
    (_id, params) =>
      new Promise((resolve, reject) => {
        writes.push({
          params,
          async answer(ok = true) {
            if (!ok) reject(new Error('write failed'))
            else {
              const units = (params.units ?? series.units).map((unit) => ({
                ...unit,
                id: unit.id ?? `unit-${++unitCount}`
              }))
              series = { ...series, units, courseIDs: units.flatMap((unit) => unit.courseIDs) }
              resolve(series)
            }
            await flushPromises()
          }
        })
      })
  )
  return { writes }
}

function findByText<E extends Element = HTMLElement>(selector: string, text: string) {
  return [...document.body.querySelectorAll<E>(selector)].find((element) => element.textContent?.trim() === text)
}

function getByText<E extends Element = HTMLElement>(selector: string, text: string) {
  const element = findByText<E>(selector, text)
  if (element == null) throw new Error(`No ${selector} reads "${text}"`)
  return element
}

function getUnitHeader(title: string) {
  return getByText('h3', title).closest('li')!
}

async function click(element: Element) {
  ;(element as HTMLElement).click()
  await flushPromises()
}

async function enterTitle(selector: string, title: string) {
  const input = document.querySelector<HTMLInputElement>(selector)!
  input.value = title
  input.dispatchEvent(new Event('input'))
  await flushPromises()
  input.closest('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
  await flushPromises()
}

async function openUnitMenu(title: string) {
  const buttons = getUnitHeader(title).querySelectorAll('button')
  await click(buttons[buttons.length - 1])
}

async function openCourseMenu(title: string) {
  const item = [...document.body.querySelectorAll('li')].find(
    (li) => li.textContent?.includes(title) && li.querySelector('h3') == null
  )!
  await click(item.querySelector('.corner-menu')!)
}

async function mountSeriesPage() {
  await signIn({ canManageCourses: true })
  const mounted = await mountPages('/course-management/space')
  await vi.waitFor(() => expect(findByText('h3', 'Arrival')).toBeDefined())
  return mounted
}

describe('course management series page', () => {
  setupPageTests()

  it('does not delete another unit when an edit fails while deleting one is being confirmed', async () => {
    const { writes } = serveSeries()
    await mountSeriesPage()

    await openUnitMenu('Arrival')
    await click(getByText('.ui-menu-item', 'Move up'))
    await openUnitMenu('Arrival')
    await click(getByText('.ui-menu-item', 'Delete unit'))
    await vi.waitFor(() => expect(document.body.textContent).toContain('will join the next unit'))
    await writes[0].answer(false)
    await click(getByText('button', 'Delete'))

    await vi.waitFor(() => expect(document.body.textContent).toContain('The units have changed meanwhile'))
    expect(writes).toHaveLength(1)
    expect(getByText('h3', 'Basics')).toBeDefined()
  })

  it('takes no unit edits from the course menus until a new unit has its ID', async () => {
    const { writes } = serveSeries()
    await mountSeriesPage()

    await click(getByText('button', 'New unit'))
    await vi.waitFor(() => expect(document.querySelector('input[placeholder="Unit title"]')).not.toBeNull())
    await enterTitle('input[placeholder="Unit title"]', 'Deep space')
    await vi.waitFor(() => expect(findByText('h3', 'Deep space')).toBeDefined())
    await openCourseMenu('First flight')
    expect(findByText('.ui-menu-item', 'Move to Unit 2')).toBeUndefined()
    expect(getUnitHeader('Basics').querySelector('button')!.disabled).toBe(true)

    await writes[0].answer()
    expect(findByText('.ui-menu-item', 'Move to Unit 2')).toBeDefined()
    expect(getUnitHeader('Deep space').querySelector('button')!.disabled).toBe(false)
  })

  it('keeps the page while a course is created after the edits are written', async () => {
    const { writes } = serveSeries()
    const { router } = await mountSeriesPage()

    await openUnitMenu('Arrival')
    await click(getByText('.ui-menu-item', 'Move up'))
    await click(getUnitHeader('Arrival').querySelector('button')!)
    const left = router.push('/elsewhere')
    await writes[0].answer()

    expect(isNavigationFailure(await left)).toBe(true)
    expect(router.currentRoute.value.path).toBe('/course-management/space')
    await vi.waitFor(() => expect(document.querySelector('input[placeholder="Enter course title"]')).not.toBeNull())
  })

  it('keeps the page when a course is created while it is being left', async () => {
    const { writes } = serveSeries()
    const { router } = await mountSeriesPage()

    await openUnitMenu('Arrival')
    await click(getByText('.ui-menu-item', 'Move up'))
    const left = router.push('/elsewhere')
    await flushPromises()
    await click(getUnitHeader('Arrival').querySelector('button')!)
    await writes[0].answer()

    expect(isNavigationFailure(await left)).toBe(true)
    expect(router.currentRoute.value.path).toBe('/course-management/space')
    await vi.waitFor(() => expect(document.querySelector('input[placeholder="Enter course title"]')).not.toBeNull())
  })
})
