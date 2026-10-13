import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, onMounted, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Disposable } from '@/utils/disposable'
import { DefaultException } from '@/utils/exception/base'
import { useRegisterLoading } from '@/utils/readiness'
import type { TutorialProject } from '@/models/tutorial/project'
import type { PlaygroundCourseProgramOptions } from './program'
import type { PlaygroundCourseSessionOptions } from './session'
import CoursePlayground from './CoursePlayground.vue'

const mocks = vi.hoisted(() => ({
  sessions: [] as any[],
  editors: [] as any[],
  loadMonaco: vi.fn().mockResolvedValue({})
}))
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
vi.mock('@/components/copilot/context', () => ({
  useCopilot: () => ({ startSession: vi.fn().mockResolvedValue(undefined), endCurrentSession: vi.fn() })
}))
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
    props: { project: { type: Object, required: true }, state: { type: Object, required: true } },
    setup:
      (_, { slots }) =>
      () =>
        slots.default?.()
  })
}))
vi.mock('@/components/editor/navbar/EditorNavbar.vue', () => ({
  default: defineComponent({
    name: 'EditorNavbar',
    props: { project: { type: Object, default: null }, state: { type: Object, default: null } },
    render: () => h('nav', 'Navbar')
  })
}))
vi.mock('./CoursePlaygroundMessageModal.vue', () => ({ default: {} }))
vi.mock('./CoursePlaygroundVideoModal.vue', () => ({ default: {} }))
vi.mock('@/components/ui', () => ({
  UIDetailedLoading: defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('div', { class: 'detailed-loading' }, slots.default?.())
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
  loadMonaco: mocks.loadMonaco,
  CodeEditorProvider: defineComponent({
    props: { apiWhitelist: { type: Array, default: null } },
    emits: ['ready'],
    setup(props, { slots, emit }) {
      const ready = ref(false)
      mocks.editors.push(ready)
      useRegisterLoading(() => !ready.value)
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
vi.mock('./program', () => ({
  PlaygroundCourseProgram: class extends Disposable {
    started = false
    constructor(readonly options: PlaygroundCourseProgramOptions) {
      super()
    }
    async start() {
      try {
        await this.options.waitForHostReady(this.getSignal())
        this.started = true
      } catch {
        // Disposal cancels the test program's pending Host handshake.
      }
    }
    complete() {
      this.dispose()
      this.options.onCompleted({ feedback: null })
    }
    fail() {
      this.dispose()
      this.options.onFailed(new DefaultException({ en: 'Startup failed', zh: '启动失败' }))
    }
  }
}))
vi.mock('./session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./session')>()
  return {
    PlaygroundCourseSession: class extends actual.PlaygroundCourseSession {
      constructor(options: PlaygroundCourseSessionOptions) {
        super(options)
        mocks.sessions.push(this)
      }
    }
  }
})

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))
beforeEach(() => {
  mocks.sessions.length = 0
  mocks.editors.length = 0
  mocks.loadMonaco.mockReset().mockResolvedValue({})
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
  it('renders the Navbar before Session and Monaco are available and covers only the main content', async () => {
    let loaded!: (monaco: object) => void
    mocks.loadMonaco.mockImplementationOnce(() => new Promise((resolve) => (loaded = resolve)))
    const wrapper = mountPlayground()
    const navbar = wrapper.findComponent({ name: 'EditorNavbar' })
    expect(wrapper.find('header nav').exists()).toBe(true)
    expect(wrapper.find('header').attributes('inert')).toBeUndefined()
    expect(wrapper.find('[role="status"]').element.parentElement).toBe(wrapper.find('main').element)
    expect(navbar.props('project')).toBeNull()
    expect(navbar.props('state')).toBeNull()
    await flushPromises()
    expect(wrapper.find('.editor').exists()).toBe(false)
    expect(wrapper.find('header nav').exists()).toBe(true)
    loaded({})
    await flushPromises()
    expect(wrapper.find('.editor').exists()).toBe(true)
  })

  it('mounts the editor under a cover and waits for real UI readiness before Start', async () => {
    const wrapper = mountPlayground()
    await flushPromises()
    const session = mocks.sessions[0]
    expect(wrapper.find('.editor').exists()).toBe(true)
    expect(wrapper.findAll('.detailed-loading')).toHaveLength(1)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(session.program.started).toBe(false)

    mocks.editors[0].value = true
    await flushPromises()
    expect(session.program.started).toBe(true)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    session.apiWhitelist.set(['stepTo'])
    session.ruler.enable()
    // A registered UI prerequisite can become pending before startup is acknowledged.
    mocks.editors[0].value = false
    const uncovered = session.program.options.onStarted(session.program.getSignal())
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    mocks.editors[0].value = true
    await uncovered
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('.apis').text()).toBe('["stepTo"]')
    expect(wrapper.find('.editor').text()).toBe('Ruler: true')
  })

  it('keeps initial configuration covered when the course completes during onStart', async () => {
    const wrapper = mountPlayground()
    await flushPromises()
    const session = mocks.sessions[0]
    mocks.editors[0].value = true
    await flushPromises()
    session.apiWhitelist.set(['stepTo'])
    mocks.editors[0].value = false
    session.program.complete()
    await flushPromises()
    expect(wrapper.emitted('courseCompleted')).toEqual([[{ feedback: null }]])
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    mocks.editors[0].value = true
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('.apis').text()).toBe('["stepTo"]')
  })

  it('retries with a covered fresh editor and cancels the previous startup acknowledgment', async () => {
    const wrapper = mountPlayground()
    await flushPromises()
    const previous = mocks.sessions[0]
    mocks.editors[0].value = true
    await flushPromises()
    mocks.editors[0].value = false
    const pending = previous.program.options.onStarted(previous.program.getSignal())
    const cancelled = expect(pending).rejects.toThrow('cancelled')
    previous.program.fail()
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('[role="alert"] button').exists()).toBe(true)
    expect(wrapper.find('main > [inert]').exists()).toBe(true)
    expect(wrapper.find('[inert] button').exists()).toBe(false)
    expect(wrapper.find('header [inert]').exists()).toBe(false)
    expect(wrapper.find('.editor').exists()).toBe(true)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('courseRestart')).toEqual([[]])
    await wrapper.setProps({ project: { title: 'Restarted course', project: {} } as TutorialProject })
    await flushPromises()
    await cancelled
    expect(previous.isDisposed).toBe(true)
    expect(mocks.sessions).toHaveLength(2)
    expect(wrapper.find('.editor').exists()).toBe(true)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(mocks.sessions[1].program.started).toBe(false)
    mocks.editors[1].value = true
    await flushPromises()
    await mocks.sessions[1].program.options.onStarted(mocks.sessions[1].program.getSignal())
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('cancels editor readiness when leaving the Playground', async () => {
    const wrapper = mountPlayground()
    await flushPromises()
    const session = mocks.sessions[0]
    expect(session.program.started).toBe(false)
    wrapper.unmount()
    await flushPromises()
    expect(session.isDisposed).toBe(true)
    expect(session.program.started).toBe(false)
  })

  it('shows a preparation error and rebuilds the session under one loading cover on retry', async () => {
    mocks.loadMonaco.mockRejectedValueOnce(new Error('Monaco unavailable'))
    const wrapper = mountPlayground()
    await flushPromises()
    const session = mocks.sessions[0]
    expect(wrapper.find('button').text()).toBe('Retry')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('[role="alert"] button').exists()).toBe(true)
    expect(wrapper.find('main > [inert]').exists()).toBe(true)

    let loaded!: (monaco: object) => void
    mocks.loadMonaco.mockImplementationOnce(() => new Promise((resolve) => (loaded = resolve)))
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.findAll('.detailed-loading')).toHaveLength(1)
    expect(wrapper.find('.editor').exists()).toBe(false)

    loaded({})
    await flushPromises()
    expect(mocks.sessions).toHaveLength(2)
    expect(session.isDisposed).toBe(true)
    expect(session.codeEditor).toBeNull()
    const replacement = mocks.sessions[1]
    expect(replacement.codeEditor).not.toBeNull()
    expect(wrapper.find('.editor').exists()).toBe(true)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    mocks.editors[0].value = true
    await flushPromises()
    await replacement.program.options.onStarted(replacement.program.getSignal())
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('main [inert]').exists()).toBe(false)
  })
})
