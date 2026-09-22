import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { createI18n } from '@/utils/i18n'
import { courseEditorRoutes, getCourseEditorRoute } from '@/apps/xbuilder/router'
import type { IRouter } from '@/components/editor/editor-state'
import type { SpxProject } from '@/models/spx/project'
import SpxProjectEditorHost from './SpxProjectEditorHost.vue'

// The host's own job is the route: which in-editor path the embedded Project Editor is told to show, and when.
// What it builds that on -- the editor state, its UI, Monaco -- is stood in for, so only the route logic is under
// test. The fake state records the `IRouter` it is synced with, which is the host's whole contract with it.
const { states, FakeEditorState } = vi.hoisted(() => {
  class FakeEditorState {
    editing = { startEditing: vi.fn() }
    selectByRoute = vi.fn()
    syncWithRouter = vi.fn((router: unknown) => {
      this.router = router as FakeEditorState['router']
    })
    dispose = vi.fn()
    /** The view of the route the host handed over, or null until `syncWithRouter` was called. */
    router: IRouter | null = null
    constructor(
      _i18n: unknown,
      public project: unknown
    ) {
      states.push(this)
    }
  }
  const states: FakeEditorState[] = []
  return { states, FakeEditorState }
})

type FakeEditorState = InstanceType<typeof FakeEditorState>

vi.mock('@/components/editor/editor-state', () => ({ EditorState: FakeEditorState }))
vi.mock('@/components/editor/ProjectEditor.vue', () => ({
  default: { name: 'ProjectEditor', render: () => null }
}))
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
vi.mock('@/models/common/cloud', () => ({ cloudHelpers: {} }))
vi.mock('@/stores/user', () => ({ useSignedInStateQuery: () => ({ data: { value: null } }) }))
vi.mock('@/utils/network', () => ({ useNetwork: () => ({ isOnline: { value: true } }) }))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  capture: vi.fn()
}))

const rootPath = 'project'
const initialPath = '/sprites/Lita/code'

/** The Course Editor path of a course-tree node, e.g. `['project', 'sprites', 'Bird']`. */
function coursePath(...segments: string[]) {
  return getCourseEditorRoute('40', '2338', segments)
}

/** What the Project Editor state is currently told the in-editor path is. */
function inEditorPathOf(state: FakeEditorState) {
  return state.router?.currentRoute.value.params.inEditorPath
}

async function mountHost(options: { at: string; active: boolean }) {
  const router = createRouter({ history: createMemoryHistory(), routes: courseEditorRoutes })
  await router.push(options.at)
  await router.isReady()
  const wrapper = mount(SpxProjectEditorHost, {
    // The project is only passed through to the editor state, which is a fake here.
    props: { project: {} as SpxProject, rootPath, initialPath, active: options.active },
    global: {
      plugins: [createI18n({ lang: 'en' }), router],
      directives: { radar: {} },
      stubs: { UIDetailedLoading: true, UIError: true }
    }
  })
  await flushPromises()
  return { wrapper, router, state: () => states[states.length - 1] }
}

describe('SpxProjectEditorHost', () => {
  beforeEach(() => {
    states.length = 0
  })

  it('leaves the route alone while the course is open on another document', async () => {
    const at = coursePath('main_course.gox')
    const { router, state } = await mountHost({ at, active: false })

    // Attaching the state to the route would immediately write the project's own path over the open document's.
    expect(state().syncWithRouter).not.toHaveBeenCalled()
    expect(router.currentRoute.value.fullPath).toBe(at)
  })

  it('opens the configured path the first time the project is shown', async () => {
    const { wrapper, router, state } = await mountHost({ at: coursePath('main_course.gox'), active: false })

    await wrapper.setProps({ active: true })
    await flushPromises()

    expect(state().selectByRoute).toHaveBeenCalledWith(['sprites', 'Lita', 'code'])
    expect(router.currentRoute.value.fullPath).toBe(coursePath('project', 'sprites', 'Lita', 'code'))
    expect(state().syncWithRouter).toHaveBeenCalled()
  })

  it('prefers the path already in the route, which is where a reload lands', async () => {
    const { router, state } = await mountHost({ at: coursePath('project', 'sprites', 'Bird'), active: true })

    expect(state().selectByRoute).toHaveBeenCalledWith(['sprites', 'Bird'])
    expect(router.currentRoute.value.fullPath).toBe(coursePath('project', 'sprites', 'Bird'))
  })

  it('goes on showing the project its own route once another document is opened', async () => {
    const { wrapper, router, state } = await mountHost({ at: coursePath('project', 'sprites', 'Bird'), active: true })

    await wrapper.setProps({ active: false })
    await router.push(coursePath('main_course.gox'))
    await flushPromises()
    expect(inEditorPathOf(state())).toEqual(['sprites', 'Bird'])

    const frozen = state().router!.currentRoute.value
    await router.push(coursePath('assets', 'videos'))
    await flushPromises()

    // The very same snapshot, so the watcher `syncWithRouter` installed never fires: nothing gets deselected
    // while the author works on another document.
    expect(state().router!.currentRoute.value).toBe(frozen)
  })

  it('drops what the project asks for while it is not the open document', async () => {
    const { wrapper, router, state } = await mountHost({ at: coursePath('project', 'sprites', 'Bird'), active: true })

    await wrapper.setProps({ active: false })
    const at = router.currentRoute.value.fullPath
    // What the editor state does on its own, e.g. re-selecting after the author deleted the selected sprite.
    await state().router!.push({ params: { inEditorPath: ['sprites', 'Lita'] } })
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe(at)
  })

  it('comes back to where the project was left, not to the configured path', async () => {
    const { wrapper, router, state } = await mountHost({ at: coursePath('project', 'sprites', 'Bird'), active: true })
    const editorState = state()

    await wrapper.setProps({ active: false })
    await router.push(coursePath('main_course.gox'))
    await flushPromises()
    // Reopening from the explorer addresses the project itself, with no path of its own.
    await router.push(coursePath('project'))
    await wrapper.setProps({ active: true })
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe(coursePath('project', 'sprites', 'Bird'))
    // The same state throughout: its selection and undo history were never rebuilt.
    expect(state()).toBe(editorState)
  })
})
