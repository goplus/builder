import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages } from '@/apps/xbuilder/pages/test'
import * as projectApis from '@/apis/project'

describe('community search', () => {
  setupPageTests()

  it('searches through the navbar and displays matching project cards', async () => {
    const { wrapper, router } = await mountPages('/')
    const input = wrapper.get('input[placeholder="Search project"]')
    await input.setValue('space')
    await input.trigger('keypress', { key: 'Enter' })
    await vi.waitFor(() => expect(router.currentRoute.value.query.q).toBe('space'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Found 1 projects for "space"'))
    expect(wrapper.get('a[href="/project/alice/Space%20game"]').text()).toContain('Space game')
    expect(projectApis.listProjects).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'space' }))
  })
})
