import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'

import { courseEditorPreviewRouteName, courseEditorRouteName, courseEditorRoutes, getCourseEditorRoute } from './router'

/** The Course Editor's route records, with the page swapped for a stub so navigating does not load it. */
function makeRouter() {
  const stub = { render: () => null }
  const routes = courseEditorRoutes.map((record) =>
    'redirect' in record ? record : ({ ...record, component: stub } as RouteRecordRaw)
  )
  return createRouter({ history: createMemoryHistory(), routes })
}

function segments(param: unknown) {
  return ([] as unknown[])
    .concat(param ?? [])
    .map(String)
    .filter((segment) => segment !== '')
}

describe('Course Editor routes', () => {
  const course = { courseSeriesIdInput: 's', courseIdInput: 'c' }

  it('reads a course node back as that node, whatever it is named', () => {
    const router = makeRouter()
    // `preview` and `edit` are the namespace names, and course content may still use them.
    const paths = [
      [],
      ['preview'],
      ['preview', 'notes.txt'],
      ['edit', 'x'],
      ['docs', 'notes.txt'],
      ['project', 'sprites']
    ]
    for (const path of paths) {
      const href = router.resolve({ name: courseEditorRouteName, params: { ...course, inCourseEditorPath: path } }).href
      const back = router.resolve(href)

      expect(back.name, href).toBe(courseEditorRouteName)
      expect(segments(back.params.inCourseEditorPath), href).toEqual(path)
    }
  })

  it('keeps the preview on its own route', () => {
    const router = makeRouter()
    const href = router.resolve({
      name: courseEditorPreviewRouteName,
      params: { ...course, inEditorPath: ['sprites'] }
    }).href

    expect(href).toBe('/course-editor/s/c/preview/sprites')
    expect(router.resolve(href).name).toBe(courseEditorPreviewRouteName)
  })

  it('opens the course root from the course address', async () => {
    const router = makeRouter()
    await router.push('/course-editor/s/c?from=list')

    expect(router.currentRoute.value.name).toBe(courseEditorRouteName)
    expect(router.currentRoute.value.fullPath).toBe('/course-editor/s/c/edit?from=list')
  })

  it('builds links that open the node', () => {
    const router = makeRouter()
    const link = getCourseEditorRoute('s', 'c', ['preview', 'notes.txt'])

    expect(link).toBe('/course-editor/s/c/edit/preview/notes.txt')
    expect(router.resolve(link).name).toBe(courseEditorRouteName)
    expect(getCourseEditorRoute('s', 'c')).toBe('/course-editor/s/c/edit')
  })
})
