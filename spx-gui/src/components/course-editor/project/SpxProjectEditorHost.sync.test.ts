import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, shallowRef } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import { createI18n } from '@/utils/i18n'
import { mockFile } from '@/models/common/test'
import { Backdrop } from '@/models/spx/backdrop'
import { Costume } from '@/models/spx/costume'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { getCourseEditorRoute } from '@/apps/xbuilder/router'
import { EditMode, type EditorState } from '@/components/editor/editor-state'
import { History } from '@/components/editor/history'
import { makeChildScopedRouter, useScopedRouterWithPathParam } from '@/utils/route'
import SpxProjectEditorHost from './SpxProjectEditorHost.vue'

// These use a real editor state: shown a route, it selects what the route names and then navigates to wherever its
// selection says, so a route the host lets through can overtake a navigation of the host's own. Only the editor's UI
// and Monaco are stood in for. Tests only move the route, as the activity bar does.
vi.mock('@/components/editor/ProjectEditor.vue', () => ({ default: { name: 'ProjectEditor', render: () => null } }))
vi.mock('@/components/editor/EditorContextProvider.vue', () => ({
  default: {
    name: 'EditorContextProvider',
    props: ['project', 'state'],
    render(this: { $slots: { default?: () => unknown } }) {
      return this.$slots.default?.()
    }
  }
}))
vi.mock('@/components/editor/spx-code-editor', () => ({
  CodeEditorProvider: {
    name: 'CodeEditorProvider',
    props: ['monaco'],
    render(this: { $slots: { default?: () => unknown } }) {
      return this.$slots.default?.()
    }
  },
  loadMonaco: () => Promise.resolve({})
}))
vi.mock('@/utils/network', async () => {
  const { ref } = await import('vue')
  return { useNetwork: () => ({ isOnline: ref(true) }) }
})
vi.mock('@/stores/user', async (importOriginal) => {
  const { makeSignedInState, makeSignedInStateQuery } = await import('@/stores/user/test')
  return {
    ...(await importOriginal<typeof import('@/stores/user')>()),
    useSignedInStateQuery: () => makeSignedInStateQuery(makeSignedInState('user'))
  }
})

/** A Course Editor path, e.g. `('project', 'stage')`. */
function coursePath(...segments: string[]) {
  return getCourseEditorRoute('40', '2338', segments)
}

/** A learner project with no owner, as a course embeds it: two sprites and a stage. */
function makeProject() {
  const project = new SpxProject()
  for (const name of ['Lita', 'Bird']) {
    const sprite = new Sprite(name)
    sprite.addCostume(new Costume('default', mockFile()))
    project.addSprite(sprite)
  }
  project.stage.addBackdrop(new Backdrop('grass', mockFile()))
  return project
}

async function mountInCourseEditor(at: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/course-editor/:courseSeriesIdInput/:courseIdInput/:inEditorPath*', component: { render: () => null } }
    ]
  })
  await router.push(at)
  await router.isReady()
  const project = makeProject()
  const state = shallowRef<EditorState | null>(null)
  const history = new History(project)
  // What `CourseEditor.vue` does: the project is open while the route's path is inside its root.
  const CourseEditorStandIn = defineComponent({
    setup() {
      const inEditorRouter = useScopedRouterWithPathParam('inEditorPath')
      const projectRouter = makeChildScopedRouter(inEditorRouter, ['edit', 'project'])
      const active = computed(
        () => inEditorRouter.currentPath.value[0] === 'edit' && inEditorRouter.currentPath.value[1] === 'project'
      )
      return () =>
        h(SpxProjectEditorHost, {
          project,
          router: projectRouter,
          history,
          active: active.value,
          'onUpdate:editorState': (next: EditorState | null) => (state.value = next)
        })
    }
  })
  const wrapper = mount(CourseEditorStandIn, {
    global: {
      plugins: [createI18n({ lang: 'en' }), router],
      directives: { radar: {} },
      stubs: { UIDetailedLoading: true, UIError: true }
    }
  })
  await flushPromises()
  return { wrapper, router, state }
}

/** Where the activity bar takes the author: `router.push`, then whatever the host and the state do about it. */
async function go(router: Awaited<ReturnType<typeof mountInCourseEditor>>['router'], path: string) {
  await router.push(path)
  await flushPromises()
}

describe('SpxProjectEditorHost with a real editor state', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('opens a new author editor at its default selection', async () => {
    const { wrapper, router, state } = await mountInCourseEditor(coursePath('program'))
    const editor = state.value
    expect(router.currentRoute.value.path).toBe(coursePath('program'))
    await go(router, coursePath('project'))
    expect(router.currentRoute.value.path).toBe(coursePath('project', 'sprites', 'Lita', 'code'))
    expect(state.value).toBe(editor)
    expect(state.value?.selectedEditMode).toBe(EditMode.Default)
    wrapper.unmount()
  })

  it('uses explicit history paths after another view is opened', async () => {
    const { wrapper, router, state } = await mountInCourseEditor(coursePath('project', 'sprites', 'Lita', 'code'))
    await go(router, coursePath('project', 'stage', 'code'))
    await go(router, coursePath('program'))
    router.back()
    await flushPromises()
    expect(state.value?.selected.type).toBe('stage')
    router.back()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(coursePath('project', 'sprites', 'Lita', 'code'))
    expect(state.value?.selected.type).toBe('sprite')
    wrapper.unmount()
  })

  it('keeps project selection while a learner preview navigates', async () => {
    const { wrapper, router, state } = await mountInCourseEditor(coursePath('project', 'stage', 'code'))
    const editor = state.value
    await go(router, '/course-editor/40/2338/preview/sprites/Bird/code')
    expect(state.value?.selected.type).toBe('stage')
    await go(router, '/course-editor/40/2338/preview/map/sprites/Lita/code')
    await go(router, coursePath('project'))
    expect(router.currentRoute.value.path).toBe(coursePath('project', 'stage', 'code'))
    expect(state.value).toBe(editor)
    wrapper.unmount()
  })

  it('comes back to the stage it was left on, not to the first sprite', async () => {
    const { wrapper, router, state } = await mountInCourseEditor(coursePath('project', 'sprites', 'Lita', 'code'))
    await go(router, coursePath('project', 'stage'))
    const left = router.currentRoute.value.fullPath
    expect(state.value?.selected.type).toBe('stage')

    await go(router, coursePath('program'))
    // The activity bar's project button addresses the project itself, with no path of its own.
    await go(router, coursePath('project'))

    expect(router.currentRoute.value.fullPath).toBe(left)
    expect(state.value?.selected.type).toBe('stage')
    wrapper.unmount()
  })

  it('comes back to the map it was left on', async () => {
    const { wrapper, router, state } = await mountInCourseEditor(coursePath('project', 'sprites', 'Lita', 'code'))
    await go(router, coursePath('project', 'map', 'sprites', 'Bird'))
    const left = router.currentRoute.value.fullPath
    expect(state.value?.selectedEditMode).toBe('map')

    await go(router, coursePath('program'))
    await go(router, coursePath('project'))

    expect(router.currentRoute.value.fullPath).toBe(left)
    expect(state.value?.selectedEditMode).toBe('map')
    wrapper.unmount()
  })

  it('stays where it is when the project button is clicked while the project is already open', async () => {
    const { wrapper, router, state } = await mountInCourseEditor(coursePath('project', 'sprites', 'Lita', 'code'))
    await go(router, coursePath('project', 'stage'))
    const at = router.currentRoute.value.fullPath

    await go(router, coursePath('project'))

    expect(router.currentRoute.value.fullPath).toBe(at)
    expect(state.value?.selected.type).toBe('stage')
    wrapper.unmount()
  })
})
