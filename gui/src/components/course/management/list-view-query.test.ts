import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { useListViewQuery } from './list-view-query'

async function mountPage(initial: string) {
  let listViewQuery: ReturnType<typeof useListViewQuery> | null = null
  const Page = defineComponent({
    setup() {
      listViewQuery = useListViewQuery()
      return () => null
    }
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/course-management', component: Page }]
  })
  await router.push(initial)
  const wrapper = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper, listViewQuery: listViewQuery! }
}

describe('useListViewQuery', () => {
  // lodash's debounce reads `Date.now`, so the clock is faked along with the timers.
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }))
  afterEach(() => vi.useRealTimers())

  it('writes the search to the route once typing pauses', async () => {
    const { router, wrapper, listViewQuery } = await mountPage('/course-management')
    listViewQuery.query.value = 'li'
    await nextTick()
    vi.advanceTimersByTime(100)
    listViewQuery.query.value = 'lita'
    await nextTick()
    vi.advanceTimersByTime(299)
    await flushPromises()
    expect(router.currentRoute.value.query.q).toBeUndefined()
    vi.advanceTimersByTime(1)
    await flushPromises()
    expect(router.currentRoute.value.query.q).toBe('lita')
    wrapper.unmount()
  })

  it('follows the route when it changes otherwise', async () => {
    const { router, wrapper, listViewQuery } = await mountPage('/course-management?q=lita&sort=title')
    expect(listViewQuery.query.value).toBe('lita')
    expect(listViewQuery.sortBy.value).toBe('title')

    await router.push('/course-management')
    await flushPromises()
    expect(listViewQuery.query.value).toBe('')
    expect(listViewQuery.sortBy.value).toBe('order')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/course-management')
    wrapper.unmount()
  })

  it('keeps what is typed while its own write lands', async () => {
    const { router, wrapper, listViewQuery } = await mountPage('/course-management')
    listViewQuery.query.value = 'lit'
    await nextTick()
    vi.advanceTimersByTime(300)
    // The write of "lit" has started; more is typed before it lands.
    listViewQuery.query.value = 'lita'
    await nextTick()
    await flushPromises()
    expect(router.currentRoute.value.query.q).toBe('lit')
    expect(listViewQuery.query.value).toBe('lita')

    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(router.currentRoute.value.query.q).toBe('lita')
    wrapper.unmount()
  })
})
