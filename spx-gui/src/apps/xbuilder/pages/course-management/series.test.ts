import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { isNavigationFailure } from 'vue-router'
import { OAuthFlow } from '@/utils/oauth'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import * as courseApis from '@/apis/course'
import * as courseSeriesApis from '@/apis/course-series'
import * as courseSeriesFile from '@/components/course/management/course-series-file'
import type { CourseSeries, CourseSeriesUnit, UpdateCourseSeriesParams } from '@/apis/course-series'

vi.mock('@/components/course/management/course-series-file', { spy: true })

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
              const courseIDs = params.courseIDs ?? series.courseIDs
              if (units.length > 0 && units.flatMap((unit) => unit.courseIDs).join() !== courseIDs.join()) {
                reject(new Error('units do not match courseIDs'))
              } else {
                series = { ...series, units, courseIDs }
                resolve(series)
              }
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

  it('writes the courses of the series with its units', async () => {
    const { writes } = serveSeries()
    await mountSeriesPage()

    await openUnitMenu('Arrival')
    await click(getByText('.ui-menu-item', 'Move up'))
    await writes[0].answer()

    expect(writes[0].params.courseIDs).toEqual(['landing', 'first-flight'])
    const headings = [...document.querySelectorAll('h3')].map((h3) => h3.textContent?.trim())
    expect(headings.filter((title) => title === 'Arrival' || title === 'Basics')).toEqual(['Arrival', 'Basics'])
  })

  it('leaves the page without waiting for the edits being written', async () => {
    serveSeries()
    const { router } = await mountSeriesPage()

    await openUnitMenu('Arrival')
    await click(getByText('.ui-menu-item', 'Move up'))
    await router.push('/elsewhere')

    expect(router.currentRoute.value.path).toBe('/elsewhere')
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

  it('opens no drawer once the page is gone, though it was not left', async () => {
    const { writes } = serveSeries()
    await mountSeriesPage()

    await openUnitMenu('Arrival')
    await click(getByText('.ui-menu-item', 'Move up'))
    await click(getUnitHeader('Arrival').querySelector('button')!)
    // Signing out elsewhere takes the page away without leaving it; the page asked to sign in again stays put.
    vi.spyOn(OAuthFlow.prototype, 'createAuthorization').mockReturnValue(new Promise(() => {}))
    localStorage.removeItem('builder-user')
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    await vi.waitFor(() => expect(findByText('h3', 'Arrival')).toBeUndefined())
    await writes[0].answer()
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(document.querySelector('input[placeholder="Enter course title"]')).toBeNull()
  })

  it('exports the series as the edits made before leave it', async () => {
    const { writes } = serveSeries()
    vi.mocked(courseSeriesFile.exportCourseSeriesFile).mockReturnValue(new Promise(() => {}))
    await mountSeriesPage()

    await click(getByText('button', 'New unit'))
    await vi.waitFor(() => expect(document.querySelector('input[placeholder="Unit title"]')).not.toBeNull())
    await enterTitle('input[placeholder="Unit title"]', 'Deep space')
    await click(getByText('button', 'Export to file'))
    expect(courseSeriesFile.exportCourseSeriesFile).not.toHaveBeenCalled()
    await writes[0].answer()

    await vi.waitFor(() => expect(courseSeriesFile.exportCourseSeriesFile).toHaveBeenCalled())
    const [exported] = vi.mocked(courseSeriesFile.exportCourseSeriesFile).mock.calls[0]
    expect(exported.units.map((unit) => unit.title)).toEqual(['Basics', 'Arrival', 'Deep space'])
  })
})
