import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, markRaw, shallowRef } from 'vue'

import { createI18n } from '@/utils/i18n'
import { makeChildScopedRouter, type IScopedRouter, type PathSegments } from '@/utils/route'
import type { SpxProject } from '@/models/spx/project'
import type { History } from '@/components/editor/history'
import SpxProjectEditorHost from './SpxProjectEditorHost.vue'

const { FakeEditorState } = vi.hoisted(() => ({
  FakeEditorState: class {
    editing = { startEditing: vi.fn() }
    router: IScopedRouter | null = null
    syncWithRouter(router: IScopedRouter) {
      this.router = router
    }
    dispose = vi.fn()
    constructor(
      _i18n: unknown,
      public project: unknown,
      ...rest: unknown[]
    ) {
      this.history = rest[4]
    }
    history: unknown
  }
}))
vi.mock('@/components/editor/editor-state', () => ({ EditorState: FakeEditorState }))
vi.mock('@/components/editor/ProjectEditor.vue', () => ({ default: { render: () => null } }))
vi.mock('@/components/editor/spx-code-editor', () => ({
  CodeEditorProvider: { render: () => null },
  loadMonaco: () => Promise.resolve({})
}))
vi.mock('@/stores/user', () => ({ useSignedInStateQuery: () => ({ data: { value: null } }) }))
vi.mock('@/utils/network', () => ({ useNetwork: () => ({ isOnline: { value: true } }) }))
enableAutoUnmount(afterEach)

async function mountHost(path: PathSegments) {
  const currentPath = shallowRef(path)
  const push = vi.fn(async (path: PathSegments) => {
    currentPath.value = path
  })
  const router = makeChildScopedRouter({ currentPath, push }, ['project'])
  const history = markRaw({}) as History
  const project = markRaw({}) as SpxProject
  const state = shallowRef<InstanceType<typeof FakeEditorState> | null>(null)
  const Host = defineComponent(() => {
    const active = computed(() => currentPath.value[0] === 'project')
    return () =>
      h(SpxProjectEditorHost, {
        project,
        router,
        active: active.value,
        history,
        'onUpdate:editorState': (next: unknown) => {
          state.value = next as InstanceType<typeof FakeEditorState> | null
        }
      })
  })
  const wrapper = mount(Host, {
    global: { plugins: [createI18n({ lang: 'en' })], directives: { radar: {} }, stubs: { EditorContextProvider: true } }
  })
  await flushPromises()
  return { wrapper, currentPath, push, state, history }
}

describe('SpxProjectEditorHost retained navigation', () => {
  it('retains a local path while inactive and restores it on a bare project route', async () => {
    const { currentPath, state } = await mountHost(['project', 'stage'])
    const editor = state.value!
    currentPath.value = ['program']
    await flushPromises()
    expect(editor.router!.currentPath.value).toEqual(['stage'])
    await editor.router!.push(['sprites', 'Bird', 'code'])
    expect(currentPath.value).toEqual(['program'])
    currentPath.value = ['project']
    await flushPromises()
    expect(currentPath.value).toEqual(['project', 'sprites', 'Bird', 'code'])
    expect(state.value).toBe(editor)
  })

  it('prefers an explicit route over the retained selection', async () => {
    const { currentPath, state } = await mountHost(['project', 'stage'])
    currentPath.value = ['program']
    await flushPromises()
    currentPath.value = ['project', 'sprites', 'Lita', 'code']
    await flushPromises()
    expect(state.value!.router!.currentPath.value).toEqual(['sprites', 'Lita', 'code'])
  })

  it('keeps initial project navigation local when opened on another view', async () => {
    const { currentPath, state, history } = await mountHost(['program'])
    await state.value!.router!.push(['sprites', 'Lita', 'code'])
    expect(currentPath.value).toEqual(['program'])
    expect(state.value!.history).toBe(history)
    currentPath.value = ['project']
    await flushPromises()
    expect(currentPath.value).toEqual(['project', 'sprites', 'Lita', 'code'])
  })
})
