import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, watch, type Ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import { createReadinessScope, ReadinessProvider, useRegisterLoading } from './index'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()))

function reporter(loading: Ref<boolean>) {
  return defineComponent({
    setup() {
      useRegisterLoading(loading)
      return () => h('span', loading.value ? 'loading' : 'ready')
    }
  })
}

function render(component: ReturnType<typeof defineComponent>) {
  const wrapper = mount(component)
  wrappers.push(wrapper)
  return wrapper
}

describe('Readiness scopes', () => {
  it('waits for a boundary to mount even when it has no async sources', async () => {
    const scope = createReadinessScope()
    expect(scope.ready.value).toBe(false)
    render(defineComponent({ render: () => h(ReadinessProvider, { scope }, () => h('span', 'mounted')) }))
    await scope.untilReady()
    expect(scope.ready.value).toBe(true)
  })

  it('aggregates nested scopes while children remain independent of parent prerequisites', async () => {
    const parent = createReadinessScope()
    const child = createReadinessScope()
    const grandchild = createReadinessScope()
    const parentLoading = ref(true)
    const childLoading = ref(false)
    const grandchildLoading = ref(false)
    render(
      defineComponent({
        render: () =>
          h(ReadinessProvider, { scope: parent }, () => [
            h(reporter(parentLoading)),
            h(ReadinessProvider, { scope: child }, () => [
              h(reporter(childLoading)),
              h(ReadinessProvider, { scope: grandchild }, () => h(reporter(grandchildLoading)))
            ])
          ])
      })
    )
    await child.untilReady()
    expect(child.ready.value).toBe(true)
    expect(parent.ready.value).toBe(false)
    parentLoading.value = false
    expect(parent.ready.value).toBe(true)
    grandchildLoading.value = true
    expect(grandchild.ready.value).toBe(false)
    expect(child.ready.value).toBe(false)
    expect(parent.ready.value).toBe(false)
    grandchildLoading.value = false
    await parent.untilReady()
    expect(parent.ready.value).toBe(true)
  })

  it('unregisters an unmounted child scope from its parent', async () => {
    const parent = createReadinessScope()
    const child = createReadinessScope()
    const showChild = ref(true)
    const childLoading = ref(true)
    render(
      defineComponent({
        render: () =>
          h(ReadinessProvider, { scope: parent }, () =>
            showChild.value
              ? h(ReadinessProvider, { scope: child }, () => h(reporter(childLoading)))
              : h('span', 'removed')
          )
      })
    )
    expect(parent.ready.value).toBe(false)
    showChild.value = false
    await parent.untilReady()
    expect(parent.ready.value).toBe(true)
    expect(child.ready.value).toBe(false)
  })

  it('waits for async descendants mounted by a completed prerequisite and commits their DOM', async () => {
    const scope = createReadinessScope()
    const dataLoading = ref(true)
    const childLoading = ref(true)
    const ParentReporter = reporter(dataLoading)
    const ChildReporter = reporter(childLoading)
    const showChild = ref(false)
    const wrapper = render(
      defineComponent({
        setup() {
          watch(
            dataLoading,
            (loading) => {
              showChild.value = !loading
            },
            { flush: 'post' }
          )
          return () =>
            h(ReadinessProvider, { scope }, () => [h(ParentReporter), showChild.value ? h(ChildReporter) : null])
        }
      })
    )
    const settled: string[] = []
    const pending = scope.untilReady().then(() => settled.push(wrapper.text()))
    await nextTick()
    dataLoading.value = false
    await flushPromises()
    expect(scope.ready.value).toBe(false)
    expect(settled).toEqual([])
    childLoading.value = false
    await pending
    expect(settled).toEqual(['readyready'])
  })

  it('cancels a pending wait through the caller signal', async () => {
    const scope = createReadinessScope()
    const loading = ref(true)
    render(defineComponent({ render: () => h(ReadinessProvider, { scope }, () => h(reporter(loading))) }))
    const ctrl = new AbortController()
    const pending = scope.untilReady(ctrl.signal)
    const cancelled = expect(pending).rejects.toThrow('cancelled')
    await nextTick()
    ctrl.abort(new Error('cancelled'))
    await cancelled
  })

  it('rejects an aborted caller even when its scope is already ready', async () => {
    const scope = createReadinessScope()
    render(defineComponent({ render: () => h(ReadinessProvider, { scope }) }))
    expect(scope.ready.value).toBe(true)
    const ctrl = new AbortController()
    ctrl.abort(new Error('cancelled'))
    await expect(scope.untilReady(ctrl.signal)).rejects.toThrow('cancelled')
  })

  it('accepts readiness reporters outside a boundary without changing another scope', async () => {
    const scope = createReadinessScope()
    render(
      defineComponent({
        render: () => h('main', [h(reporter(ref(true))), h(ReadinessProvider, { scope }, () => h('span', 'content'))])
      })
    )
    await scope.untilReady()
    expect(scope.ready.value).toBe(true)
  })
})
