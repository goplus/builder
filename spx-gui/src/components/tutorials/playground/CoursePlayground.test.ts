import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, onMounted, ref, shallowReactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Disposable } from '@/utils/disposable'
import { DefaultException } from '@/utils/exception/base'
import { useRegisterUIReady } from '@/utils/ui-ready'
import type { TutorialProject } from '@/models/tutorial/project'
import type { PlaygroundCourseSessionOptions } from './session'
import CoursePlayground from './CoursePlayground.vue'

const mocks = vi.hoisted(() => ({ sessions: [] as any[], editors: [] as any[] }))
vi.mock('vue-router', () => ({ useRouter: () => ({ currentRoute: ref({ params: {}, query: {} }), push: vi.fn() }) }))
vi.mock('@/utils/i18n', () => ({ useI18n: () => ({ lang: ref('en') }) }))
vi.mock('@/utils/network', () => ({ useNetwork: () => ({ isOnline: ref(true) }) }))
vi.mock('@/utils/user', () => ({ useEnsureSignedIn: () => vi.fn() }))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (fn: unknown) => ({ fn })
}))
vi.mock('@/apps/xbuilder/router', () => ({ getOwnProjectEditorRoute: vi.fn() }))
vi.mock('@/stores/user', () => ({ useSignedInStateQuery: () => ({}) }))
vi.mock('@/models/common/cloud', () => ({ cloudHelpers: {} }))
vi.mock('@/components/copilot/context', () => ({ useCopilot: () => ({}) }))
vi.mock('@/utils/radar', () => ({ useRadar: () => ({ select: vi.fn() }) }))
vi.mock('@/utils/spotlight', () => ({ useSpotlight: () => ({ reveal: vi.fn() }) }))
vi.mock('@/components/project', () => ({ useSaveProjectAs: () => vi.fn() }))
vi.mock('@/components/editor/editor-state', () => ({
  EditorState: class extends Disposable {
    editing = { startEditing: vi.fn() }
    syncWithRouter() {}
  }
}))
vi.mock('@/components/editor/EditorContextProvider.vue', () => ({
  default: defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        slots.default?.()
  })
}))
vi.mock('@/components/editor/navbar/EditorNavbar.vue', () => ({ default: defineComponent({ render: () => null }) }))
vi.mock('./CoursePlaygroundMessageModal.vue', () => ({ default: {} }))
vi.mock('./CoursePlaygroundVideoModal.vue', () => ({ default: {} }))
vi.mock('@/components/ui', () => ({
  UIDetailedLoading: defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('div', slots.default?.())
  }),
  UIError: defineComponent({
    props: { retry: { type: Function, default: null } },
    setup: (props) => () => h('button', { onClick: props.retry }, 'Retry')
  }),
  UIMenuGroup: {},
  UIMenuItem: {},
  useModal: () => vi.fn()
}))
vi.mock('@/components/editor/spx-code-editor', () => ({
  loadMonaco: vi.fn().mockResolvedValue({}),
  CodeEditorProvider: defineComponent({
    props: { apiWhitelist: { type: Array, default: null } },
    emits: ['ready'],
    setup(props, { slots, emit }) {
      const ready = ref(false)
      mocks.editors.push(ready)
      useRegisterUIReady(ready)
      onMounted(() => emit('ready', { formatWorkspace: vi.fn() }))
      return () => h('div', [h('p', { class: 'apis' }, JSON.stringify(props.apiWhitelist)), slots.default?.()])
    }
  })
}))
vi.mock('@/components/editor/ProjectEditor.vue', () => ({
  default: defineComponent({
    props: { rulerEnabled: Boolean },
    setup: (props) => () => h('div', { class: 'editor' }, `Ruler: ${props.rulerEnabled}`)
  })
}))
vi.mock('./session', () => ({
  PlaygroundCourseSession: class extends Disposable {
    project: TutorialProject
    editorState: unknown
    apiWhitelist = shallowReactive({ apis: null as string[] | null })
    ruler = shallowReactive({ enabled: false })
    listeners = new Map<string, (payload: unknown) => void>()
    started = false
    constructor(readonly options: PlaygroundCourseSessionOptions) {
      super()
      this.project = options.project
      this.editorState = options.editorState
      mocks.sessions.push(this)
    }
    on(event: string, fn: (payload: unknown) => void) {
      this.listeners.set(event, fn)
    }
    async start() {
      try {
        await this.options.waitForEditor(this.getSignal())
        this.started = true
      } catch {
        // Disposal cancels the test program's pending UI handshake.
      }
    }
  }
}))

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))
beforeEach(() => {
  mocks.sessions.length = 0
  mocks.editors.length = 0
})

function mountPlayground() {
  const wrapper = mount(CoursePlayground, {
    props: { project: { title: 'Course', project: {} } as TutorialProject, inEditorPath: [] },
    global: { mocks: { $t: (message: { en: string }) => message.en } }
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('Playground startup rendering', () => {
  it('mounts the editor under a cover and waits for real UI readiness before Start', async () => {
    const wrapper = mountPlayground()
    await flushPromises()
    const session = mocks.sessions[0]
    expect(wrapper.find('.editor').exists()).toBe(true)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(session.started).toBe(false)

    mocks.editors[0].value = true
    await flushPromises()
    expect(session.started).toBe(true)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    session.apiWhitelist.apis = ['stepTo']
    session.ruler.enabled = true
    // API data refresh may still be pending after the fast configuration call returns.
    mocks.editors[0].value = false
    const uncovered = session.options.onStarted(session.getSignal())
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    mocks.editors[0].value = true
    await uncovered
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('.apis').text()).toBe('["stepTo"]')
    expect(wrapper.find('.editor').text()).toBe('Ruler: true')
  })

  it('retries with a covered fresh editor and cancels the previous startup acknowledgment', async () => {
    const wrapper = mountPlayground()
    await flushPromises()
    const previous = mocks.sessions[0]
    mocks.editors[0].value = true
    await flushPromises()
    mocks.editors[0].value = false
    const pending = previous.options.onStarted(previous.getSignal())
    const cancelled = expect(pending).rejects.toThrow('cancelled')
    previous.listeners.get('failed')(new DefaultException({ en: 'Startup failed', zh: '启动失败' }))
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('main').attributes('inert')).toBeUndefined()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    await cancelled
    expect(previous.isDisposed).toBe(true)
    expect(mocks.sessions).toHaveLength(2)
    expect(wrapper.find('.editor').exists()).toBe(true)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(mocks.sessions[1].started).toBe(false)
    mocks.editors[1].value = true
    await flushPromises()
    await mocks.sessions[1].options.onStarted(mocks.sessions[1].getSignal())
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('cancels editor readiness when leaving the Playground', async () => {
    const wrapper = mountPlayground()
    await flushPromises()
    const session = mocks.sessions[0]
    expect(session.started).toBe(false)
    wrapper.unmount()
    await flushPromises()
    expect(session.isDisposed).toBe(true)
    expect(session.started).toBe(false)
  })
})
