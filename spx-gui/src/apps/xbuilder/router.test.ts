import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { repeatableParamToPathSegments } from '@/utils/route'
import { courseEditorRoute, getCourseEditorRoute } from './router'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ ...courseEditorRoute, component: { render: () => null } }]
  })
}

describe('Course Editor routes', () => {
  it('uses one route record for editing and preview', () => {
    const router = makeRouter()
    for (const path of ['editor', 'editor/project/stage', 'editor/program', 'preview/sprites/Lita/code']) {
      const resolved = router.resolve(`/course-editor/s/c/${path}`)
      expect(resolved.matched[0].path).toBe(courseEditorRoute.path)
      expect(resolved.params.courseSeriesIdInput).toBe('s')
      expect(resolved.params.courseIdInput).toBe('c')
      expect(resolved.params.inEditorPath).toEqual(path.split('/'))
    }
  })

  it('builds links with encoded identifiers and decoded path segments', () => {
    const router = makeRouter()
    const link = getCourseEditorRoute('s/a', 'c b', ['project', 'sprites', 'A/B', 'code'])
    const resolved = router.resolve(link)
    expect(resolved.params.courseSeriesIdInput).toBe('s/a')
    expect(resolved.params.courseIdInput).toBe('c b')
    expect(repeatableParamToPathSegments(resolved.params.inEditorPath)).toEqual([
      'editor',
      'project',
      'sprites',
      'A/B',
      'code'
    ])
    expect(getCourseEditorRoute('s', 'c')).toBe('/course-editor/s/c/editor')
  })
})
