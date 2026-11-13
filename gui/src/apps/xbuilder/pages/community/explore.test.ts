import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages } from '@/apps/xbuilder/pages/test'
import { ExploreOrder } from '@/apis/project'

describe('community explore', () => {
  setupPageTests()

  it('changes the explore ordering and reloads the project cards', async () => {
    const { wrapper, router } = await mountPages('/explore')
    await vi.waitFor(() => expect(wrapper.text()).toContain(ExploreOrder.MostLikes))
    const order = wrapper.findAll('button').find((button) => button.text() === 'Most recent remixes')!
    await order.trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.query.o).toBe(ExploreOrder.MostRemixes))
    await vi.waitFor(() =>
      expect(wrapper.find(`a[href="/project/alice/${ExploreOrder.MostRemixes}"]`).exists()).toBe(true)
    )
  })
})
