import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import Sortable from 'sortablejs'
import type { QueryClient } from '@tanstack/vue-query'
import { isNavigationFailure } from 'vue-router'
import { OAuthFlow } from '@/utils/oauth'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import * as courseApis from '@/apis/course'
import * as courseSeriesApis from '@/apis/course-series'
import * as courseSeriesFile from '@/components/course/management/course-series-file'
import type { CourseSeries, CourseSeriesUnit, UpdateCourseSeriesParams } from '@/apis/course-series'
import GuidedCourseDrawer from '@/components/course/management/GuidedCourseDrawer.vue'
import CourseSeriesDrawer from '@/components/course/management/CourseSeriesDrawer.vue'

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

/** A series in `units`, two by default, whose writes are answered when the test says. */
function serveSeries(
  units: CourseSeriesUnit[] = [
    { id: 'basics', title: 'Basics', courseIDs: ['first-flight'] },
    { id: 'arrival', title: 'Arrival', courseIDs: ['landing'] }
  ]
) {
  let series: CourseSeries = {
    id: 'space',
    owner: 'alice',
    kind: 'guided',
    title: 'Space adventures',
    description: '',
    thumbnail: '',
    courseIDs: units.length === 0 ? ['first-flight', 'landing'] : units.flatMap((unit) => unit.courseIDs),
    units,
    order: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }
  const courses = [
    makeCourse('first-flight', 'First flight'),
    makeCourse('landing', 'Landing'),
    makeCourse('splashdown', 'Splashdown')
  ]
  vi.mocked(courseSeriesApis.getCourseSeries).mockImplementation(async () => series)
  vi.mocked(courseApis.listAllSeriesCourses).mockImplementation(async () =>
    series.courseIDs.map((id) => courses.find((course) => course.id === id)!)
  )
  const writes: Array<{ params: UpdateCourseSeriesParams; answer: (ok?: boolean) => Promise<void> }> = []
  vi.mocked(courseSeriesApis.updateCourseSeries).mockImplementation(
    (_id, params) =>
      new Promise((resolve, reject) => {
        writes.push({
          params,
          async answer(ok = true) {
            if (!ok) reject(new Error('write failed'))
            else {
              const units = params.units ?? series.units
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

async function mountSeriesPage() {
  await signIn({ canManageCourses: true })
  const mounted = await mountPages('/course-management/space')
  await vi.waitFor(() => expect(findByText('h3', 'Arrival')).toBeDefined())
  return mounted
}

describe('course management series page', () => {
  setupPageTests()

  it('keeps local edits independent of shared cache updates', async () => {
    const { writes } = serveSeries()
    const { wrapper } = await mountSeriesPage()
    const queryClient = wrapper.vm.$.appContext.provides.VUE_QUERY_CLIENT as QueryClient
    const series = await courseSeriesApis.getCourseSeries('space')
    queryClient.setQueryData(['course-series', 'space'], {
      ...series,
      title: 'Shared cache update',
      courseIDs: ['splashdown'],
      units: [{ id: 'other', title: 'Other unit', courseIDs: ['splashdown'] }]
    })
    queryClient.setQueryData(['course-series-courses', 'space'], [makeCourse('splashdown', 'Splashdown')])
    await flushPromises()
    expect(getByText('h1', 'Space adventures')).toBeDefined()
    expect(getByText('h3', 'Basics')).toBeDefined()
    expect(findByText('h3', 'Other unit')).toBeUndefined()

    await openUnitMenu('Arrival')
    await click(getByText('.ui-menu-item', 'Move up'))
    await writes[0].answer()
    expect(writes[0].params.courseIDs).toEqual(['landing', 'first-flight'])
    expect(courseApis.listAllSeriesCourses).toHaveBeenCalledTimes(1)

    await click(getByText('button', 'Edit series'))
    await vi.waitFor(() => expect(wrapper.findComponent(CourseSeriesDrawer).exists()).toBe(true))
    wrapper
      .findComponent(CourseSeriesDrawer)
      .vm.$emit('resolved', { ...series, title: 'Local title', ...writes[0].params })
    await flushPromises()
    expect(getByText('h1', 'Local title')).toBeDefined()
  })

  it('adds a created course to local state before the next reorder without refetching', async () => {
    const { writes } = serveSeries([])
    await signIn({ canManageCourses: true })
    const { wrapper } = await mountPages('/course-management/space')
    await vi.waitFor(() => expect(document.body.textContent).toContain('Courses (2)'))
    await click(getByText('button', 'Create course'))
    await vi.waitFor(() => expect(wrapper.findComponent(GuidedCourseDrawer).exists()).toBe(true))
    const series = await courseSeriesApis.getCourseSeries('space')
    const course = makeCourse('splashdown', 'Splashdown')
    wrapper.findComponent(GuidedCourseDrawer).vm.$emit('resolved', {
      course,
      courseSeries: { ...series, courseIDs: [...series.courseIDs, course.id] }
    })
    await flushPromises()
    expect(document.body.textContent).toContain('Courses (3)')
    expect(courseApis.listAllSeriesCourses).toHaveBeenCalledTimes(1)

    const list = document.querySelector<HTMLElement>('ul[aria-label="Course list"]')!
    const sortable = Sortable.get(list)!
    sortable.option('onEnd')!.call(sortable, { oldDraggableIndex: 2, newDraggableIndex: 0 } as Sortable.SortableEvent)
    await flushPromises()
    expect(writes[0].params.courseIDs).toEqual(['splashdown', 'first-flight', 'landing'])
    await writes[0].answer()
  })

  it('keeps course edits and deletions in local state without reloading the list', async () => {
    serveSeries()
    vi.mocked(courseApis.deleteCourse).mockResolvedValue(undefined)
    const { wrapper } = await mountSeriesPage()
    await click(document.querySelector('[aria-label^="Course item"]')!)
    await vi.waitFor(() => expect(wrapper.findComponent(GuidedCourseDrawer).exists()).toBe(true))
    wrapper.findComponent(GuidedCourseDrawer).vm.$emit('resolved', {
      course: makeCourse('first-flight', 'First flight revised'),
      courseSeries: null
    })
    await flushPromises()
    expect(document.body.textContent).toContain('First flight revised')
    const item = document.querySelector('[aria-label^="Course item"]')!
    await click(item.querySelector('.corner-menu')!)
    await click(getByText('.ui-menu-item', 'Delete'))
    await click(getByText('button', 'Delete'))
    await vi.waitFor(() => expect(document.body.textContent).toContain('Courses (1)'))
    expect(document.body.textContent).not.toContain('First flight revised')
    expect(courseApis.listAllSeriesCourses).toHaveBeenCalledTimes(1)
  })

  it('deletes the unit asked about when an edit fails while deleting it is being confirmed', async () => {
    const { writes } = serveSeries()
    await mountSeriesPage()

    await openUnitMenu('Arrival')
    await click(getByText('.ui-menu-item', 'Move up'))
    await openUnitMenu('Arrival')
    await click(getByText('.ui-menu-item', 'Delete unit'))
    await vi.waitFor(() => expect(document.body.textContent).toContain('will join the next unit'))
    // "Arrival" is back after "Basics", whose place it took; its course still joins "Basics", now the unit before it.
    await writes[0].answer(false)
    await click(getByText('button', 'Delete'))

    await vi.waitFor(() => expect(writes).toHaveLength(2))
    expect(writes[1].params.units).toEqual([{ id: 'basics', title: 'Basics', courseIDs: ['first-flight', 'landing'] }])
  })

  it('does not merge a deleted unit into another unit than the one asked about, as an edit failing may make it', async () => {
    const { writes } = serveSeries([
      { id: 'basics', title: 'Basics', courseIDs: ['first-flight'] },
      { id: 'arrival', title: 'Arrival', courseIDs: ['landing'] },
      { id: 'homecoming', title: 'Homecoming', courseIDs: ['splashdown'] }
    ])
    await mountSeriesPage()

    await openUnitMenu('Homecoming')
    await click(getByText('.ui-menu-item', 'Move up'))
    await openUnitMenu('Arrival')
    await click(getByText('.ui-menu-item', 'Delete unit'))
    await vi.waitFor(() => expect(document.body.textContent).toContain('will join the unit before'))
    // The units are back in their order, and the unit before "Arrival" is now "Basics", not "Homecoming".
    await writes[0].answer(false)
    await click(getByText('button', 'Delete'))

    await vi.waitFor(() => expect(document.body.textContent).toContain('The units have changed meanwhile'))
    expect(writes).toHaveLength(1)
    expect(getByText('h3', 'Arrival')).toBeDefined()
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
