import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { timeout } from '@/utils/utils'
import { MockProject } from '@/models/common/test'
import { makeSignedInState, makeSignedInStateQuery } from '@/stores/user/test'
import UIDetailedLoading from '@/components/ui/loading/UIDetailedLoading.vue'
import EditorPage from './index.vue'

const mocks = vi.hoisted(() => ({
  loadCloud: vi.fn(),
  loadCache: vi.fn(),
  loadProject: vi.fn(),
  loadMonaco: vi.fn()
}))

vi.mock('@lottiefiles/dotlottie-vue', () => ({
  DotLottieVue: { template: '<div />', methods: { getDotLottieInstance: () => null } }
}))
vi.mock('@/components/ui', async () => ({
  UIDetailedLoading: (await import('@/components/ui/loading/UIDetailedLoading.vue')).default,
  UIError: { template: '<div><slot /></div>' },
  useConfirmDialogWithResult: () => vi.fn(),
  useMessage: () => ({ withLoading: vi.fn() })
}))
vi.mock('@/stores/user', () => ({
  useSignedInStateQuery: () => makeSignedInStateQuery(makeSignedInState('alice'))
}))
vi.mock('@/utils/route-loading', () => ({ useRegisterUpdateRouteLoaded: vi.fn() }))
vi.mock('../../router', () => ({ getProjectEditorRoute: vi.fn() }))
vi.mock('@/models/common/cloud', () => ({ cloudHelpers: { load: mocks.loadCloud } }))
vi.mock('@/models/common/local', () => ({ localHelpers: { load: mocks.loadCache } }))
vi.mock('@/models/spx/project', () => ({
  SpxProject: class extends MockProject {
    disposeOnSignal() {}
    load = mocks.loadProject
  }
}))
vi.mock('@/components/editor/editor-state', async () => {
  const { Editing } = await import('@/components/editor/editing')
  return {
    EditorState: class {
      editing: InstanceType<typeof Editing>
      constructor(
        _i18n: unknown,
        public project: MockProject,
        isOnline: ConstructorParameters<typeof Editing>[3],
        signedInStateQuery: ReturnType<typeof makeSignedInStateQuery>,
        cloudHelpers: ConstructorParameters<typeof Editing>[1],
        localCache: ConstructorParameters<typeof Editing>[2]
      ) {
        this.editing = new Editing(project, cloudHelpers, localCache, isOnline, signedInStateQuery)
        this.editing.startEditing = vi.fn()
      }
      disposeOnSignal(signal: AbortSignal) {
        this.editing.disposeOnSignal(signal)
      }
      syncWithRouter() {}
    }
  }
})
vi.mock('@/components/editor/spx-code-editor', () => ({
  loadMonaco: mocks.loadMonaco,
  CodeEditorProvider: { template: '<div><slot /></div>' }
}))
vi.mock('@/components/project', () => ({ usePublishProject: () => vi.fn() }))
vi.mock('@/components/editor/navbar/EditorNavbar.vue', () => ({ default: { template: '<header />' } }))
vi.mock('@/components/editor/EditorContextProvider.vue', () => ({
  default: { template: '<div><slot /></div>' }
}))
vi.mock('@/components/editor/ProjectEditor.vue', () => ({ default: { template: '<div>Editor ready</div>' } }))

describe('Editor loading progress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    { name: 'fast cloud and cache', cloudDelay: 100, cacheDelay: 100, projectDelay: 1500, monacoDelay: 2000 },
    { name: 'slow cloud', cloudDelay: 1500, cacheDelay: 100, projectDelay: 300, monacoDelay: 2000 },
    { name: 'Monaco finishing first', cloudDelay: 1500, cacheDelay: 100, projectDelay: 300, monacoDelay: 100 }
  ])(
    'keeps displayed progress increasing with $name',
    async ({ cloudDelay, cacheDelay, projectDelay, monacoDelay }) => {
      mocks.loadCloud.mockImplementation(async () => {
        await timeout(cloudDelay)
        return { metadata: { owner: 'alice', name: 'project' }, files: {} }
      })
      mocks.loadCache.mockImplementation(async () => {
        await timeout(cacheDelay)
        return null
      })
      mocks.loadProject.mockImplementation(() => timeout(projectDelay))
      mocks.loadMonaco.mockImplementation(async () => {
        await timeout(monacoDelay)
        return {}
      })
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/editor/:ownerNameInput/:projectNameInput', component: EditorPage, props: true }]
      })
      await router.push('/editor/alice/project')
      const wrapper = mount(defineComponent({ components: { RouterView }, template: '<RouterView />' }), {
        global: { plugins: [router, createI18n({ lang: 'en' })] }
      })
      try {
        await flushPromises()
        const percentages: number[] = []
        const completionTime = Math.max(cloudDelay + cacheDelay + projectDelay, monacoDelay)
        for (let elapsed = 0; elapsed < completionTime; elapsed += 100) {
          const loading = wrapper.findComponent(UIDetailedLoading)
          expect(loading.exists()).toBe(true)
          const percentage = Number(loading.text().match(/(\d+)%/)![1])
          if (percentages.length > 0) expect(percentage).toBeGreaterThanOrEqual(percentages.at(-1)!)
          percentages.push(percentage)
          await vi.advanceTimersByTimeAsync(100)
          await flushPromises()
        }
        expect(percentages[0]).toBe(0)
        expect(percentages.some((p) => p > 0)).toBe(true)
        if (monacoDelay > cloudDelay + cacheDelay + projectDelay) {
          expect(percentages.at(-1)).toBeGreaterThanOrEqual(99)
        } else {
          expect(percentages[monacoDelay / 100]).toBe(33)
        }
        expect(wrapper.text()).toContain('Editor ready')
      } finally {
        wrapper.unmount()
      }
    }
  )
})
