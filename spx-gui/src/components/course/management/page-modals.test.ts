import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, isNavigationFailure, RouterView } from 'vue-router'
import { Cancelled } from '@/utils/exception'
import { usePageModals } from './page-modals'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

async function mountPage(initial: string) {
  let pageModals: ReturnType<typeof usePageModals> | null = null
  const Page = defineComponent(() => {
    pageModals = usePageModals()
    return () => h('div')
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/series/:id', component: Page },
      { path: '/elsewhere', component: defineComponent(() => () => h('div')) }
    ]
  })
  await router.push(initial)
  const wrapper = mount(RouterView, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper, keepPageFor: pageModals!.keepPageFor }
}

describe('usePageModals', () => {
  it('keeps the page while a dialog it opened is open', async () => {
    const { router, wrapper, keepPageFor } = await mountPage('/series/1')
    const dialog = deferred<string>()
    const kept = keepPageFor(dialog.promise)

    expect(isNavigationFailure(await router.push('/elsewhere'))).toBe(true)
    expect(isNavigationFailure(await router.push('/series/2'))).toBe(true)
    expect(router.currentRoute.value.fullPath).toBe('/series/1')
    // The page's own query, such as its search, still changes.
    expect(isNavigationFailure(await router.replace('/series/1?q=lita'))).toBe(false)

    dialog.resolve('done')
    expect(await kept).toBe('done')
    expect(isNavigationFailure(await router.push('/elsewhere'))).toBe(false)
    wrapper.unmount()
  })

  it('ends a dialog that outlives its page in Cancelled', async () => {
    const { wrapper, keepPageFor } = await mountPage('/series/1')
    const dialog = deferred<string>()
    const kept = keepPageFor(dialog.promise)

    wrapper.unmount()
    dialog.resolve('done')
    await expect(kept).rejects.toBeInstanceOf(Cancelled)
  })
})
