import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, shallowRef } from 'vue'
import { createMemoryHistory, createRouter, useRoute } from 'vue-router'

import { createI18n } from '@/utils/i18n'
import { mockFile } from '@/models/common/test'
import { Backdrop } from '@/models/spx/backdrop'
import { Costume } from '@/models/spx/costume'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { courseEditorRoutes, getCourseEditorRoute } from '@/apps/xbuilder/router'
import type { EditorState } from '@/components/editor/editor-state'
import { inCourseEditorPathParam, isPathWithin, paramToSegments, segmentsToPath } from '../route'
import SpxProjectEditorHost from './SpxProjectEditorHost.vue'

// The other host tests stand a fake in for the editor state, to look at the host alone. These use the real one,
// because the round trip they cover runs through it: shown a route, the state selects what the route names and
// then navigates to wherever its selection says -- so a route the host lets through can overtake a navigation of
// the host's own. Only the editor's UI and Monaco are stood in for. The host is mounted the way the Course Editor
// mounts it, open exactly while the route is inside the project, so tests only move the route, as the activity bar
// does.
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

const rootPath = 'project'

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
  const router = createRouter({ history: createMemoryHistory(), routes: courseEditorRoutes })
  await router.push(at)
  await router.isReady()
  const project = makeProject()
  const state = shallowRef<EditorState | null>(null)
  // What `CourseEditor.vue` does: the project is open while the route's path is inside its root.
  const CourseEditorStandIn = defineComponent({
    setup() {
      const route = useRoute()
      const active = computed(() =>
        isPathWithin(segmentsToPath(paramToSegments(route.params[inCourseEditorPathParam])), rootPath)
      )
      return () =>
        h(SpxProjectEditorHost, {
          project,
          rootPath,
          initialPath: '/sprites/Lita/code',
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

  it('comes back to the stage it was left on, not to the first sprite', async () => {
    const { wrapper, router, state } = await mountInCourseEditor(coursePath('project', 'sprites', 'Lita', 'code'))
    await go(router, coursePath('project', 'stage'))
    const left = router.currentRoute.value.fullPath
    expect(state.value?.selected.type).toBe('stage')

    await go(router, coursePath('main_course.gox'))
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

    await go(router, coursePath('main_course.gox'))
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
