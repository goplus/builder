import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { repeatableParamToPathSegments } from '@/utils/route'
import { getCourseEditorRoute } from './router'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/course-editor/:courseSeriesIdInput/:courseIdInput/:inEditorPath*', component: { render: () => null } }
    ]
  })
}

describe('Course Editor routes', () => {
  it('builds links with encoded identifiers and decoded path segments', () => {
    const router = makeRouter()
    const link = getCourseEditorRoute('s/a', 'c b', ['project', 'sprites', 'A/B', 'code'])
    const resolved = router.resolve(link)
    expect(resolved.params.courseSeriesIdInput).toBe('s/a')
    expect(resolved.params.courseIdInput).toBe('c b')
    expect(repeatableParamToPathSegments(resolved.params.inEditorPath)).toEqual([
      'edit',
      'project',
      'sprites',
      'A/B',
      'code'
    ])
    expect(getCourseEditorRoute('s', 'c')).toBe('/course-editor/s/c/edit')
  })
})
