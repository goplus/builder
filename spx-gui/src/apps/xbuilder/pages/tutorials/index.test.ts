import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages } from '@/apps/xbuilder/pages/test'

describe('tutorials', () => {
  setupPageTests()

  it('loads tutorial series and links to the selected series', async () => {
    const { wrapper, router } = await mountPages('/tutorials')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Space adventures'))
    expect(wrapper.text()).toContain('2 Total')
    await wrapper.get('a[href="/course-series/space"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/course-series/space')
    await vi.waitFor(() => expect(wrapper.text()).toContain('First flight'))
    expect(wrapper.text()).toContain('Build your first space game')
    expect(wrapper.get('a[href="/course/space/first-flight/start"]').text()).toContain('First flight')
  })
})
