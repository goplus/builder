import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import { createI18n } from '@/utils/i18n'
import { getCourseEditorRoute } from '../../router'
import CourseEditorPage from './index.vue'

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), getCourse: vi.fn(), getSeries: vi.fn(), load: vi.fn() }))
vi.mock('@/apis/course', () => ({ getCourse: mocks.getCourse }))
vi.mock('@/apis/course-series', () => ({ getCourseSeries: mocks.getSeries }))
vi.mock('@/models/tutorial/project', () => ({ TutorialProject: { load: mocks.load } }))
vi.mock('@/stores/user', () => ({
  useSignedInStateQuery: () => ({ data: ref({ isSignedIn: true, user: { capabilities: { canManageCourses: true } } }) })
}))
vi.mock('@/utils/utils', async (original) => ({
  ...(await original<typeof import('@/utils/utils')>()),
  usePageTitle: vi.fn()
}))
vi.mock('@/components/course-editor/CourseEditor.vue', () => ({
  default: defineComponent({
    name: 'CourseEditor',
    props: {
      course: { type: Object, required: true },
      series: { type: Object, required: true },
      project: { type: Object, required: true },
      router: { type: Object, required: true }
    },
    setup(_props, { expose }) {
      expose({ confirmDiscardingUnsavedChanges: mocks.confirm })
      return () => h('div', 'Course editor')
    }
  })
}))
enableAutoUnmount(afterEach)

async function openEditor() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/course-editor/:courseSeriesIdInput/:courseIdInput/:inEditorPath*',
        component: CourseEditorPage,
        props: true
      },
      { path: '/elsewhere', component: { render: () => null } }
    ]
  })
  await router.push(getCourseEditorRoute('s', 'c'))
  const wrapper = mount(RouterView, {
    global: {
      plugins: [createI18n({ lang: 'en' }), router],
      directives: { radar: {} },
      stubs: { UIDetailedLoading: true, UIError: true }
    }
  })
  await flushPromises()
  return { router, wrapper }
}

describe('Course Editor page navigation guards', () => {
  beforeEach(() => {
    mocks.confirm.mockReset().mockResolvedValue(true)
    mocks.getCourse.mockReset().mockImplementation(async (id: string) => ({ id, kind: 'playground', title: id }))
    mocks.getSeries.mockReset().mockImplementation(async (id: string) => ({ id, courseIDs: ['c', 'next'] }))
    mocks.load.mockReset().mockImplementation(async () => ({ dispose: vi.fn() }))
  })

  it('keeps one editing session through view, preview and query/hash changes', async () => {
    const { router, wrapper } = await openEditor()
    const editor = wrapper.findComponent({ name: 'CourseEditor' }).vm
    const project = wrapper.findComponent({ name: 'CourseEditor' }).props('project')
    for (const path of ['edit/project/stage', 'preview/sprites/Lita/code', 'edit/program']) {
      await router.push(`/course-editor/s/c/${path}?from=list#anchor`)
      await flushPromises()
      expect(wrapper.findComponent({ name: 'CourseEditor' }).vm).toBe(editor)
    }
    expect(mocks.confirm).not.toHaveBeenCalled()
    expect(mocks.load).toHaveBeenCalledTimes(1)
    expect(wrapper.findComponent({ name: 'CourseEditor' }).props('project')).toBe(project)
  })

  it.each([getCourseEditorRoute('s', 'next'), getCourseEditorRoute('another-series', 'c'), '/elsewhere'])(
    'checks the current editor before navigating to %s',
    async (target) => {
      const { router, wrapper } = await openEditor()
      const editor = wrapper.findComponent({ name: 'CourseEditor' }).vm
      mocks.confirm.mockResolvedValue(false)
      await router.push(target)
      await flushPromises()
      expect(router.currentRoute.value.path).toBe(getCourseEditorRoute('s', 'c'))
      expect(wrapper.findComponent({ name: 'CourseEditor' }).vm).toBe(editor)
      expect(mocks.load).toHaveBeenCalledTimes(1)
      mocks.confirm.mockResolvedValue(true)
      await router.push(target)
      await flushPromises()
      expect(router.currentRoute.value.path).toBe(target)
      expect(mocks.confirm).toHaveBeenCalledTimes(2)
    }
  )
})
