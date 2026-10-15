import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn, makeProject } from '@/apps/xbuilder/pages/test'
import { ExploreOrder } from '@/apis/project'
import * as projectApis from '@/apis/project'

describe('community home', () => {
  setupPageTests()

  it('loads community projects and opens a project from its card', async () => {
    const { wrapper, router } = await mountPages('/')
    await vi.waitFor(() => expect(wrapper.text()).toContain(ExploreOrder.MostLikes))
    expect(wrapper.text()).toContain(ExploreOrder.MostRemixes)
    const card = wrapper.get(`a[href="/project/alice/${ExploreOrder.MostLikes}"]`)
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/project/alice/${ExploreOrder.MostLikes}`)
  })

  it('shows the signed-in user their projects and links to the editor', async () => {
    await signIn()
    const { wrapper, router } = await mountPages('/')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Your projects'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('My spaceship'))
    expect(wrapper.text()).toContain('Users you follow are creating')
    expect(wrapper.get('a[href="/user/alice/projects"]').text()).toContain('View all')
    await wrapper.get('a[href="/project/alice/My%20spaceship"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('button[aria-label="Edit button"]').exists()).toBe(true))
    await wrapper.get('button[aria-label="Edit button"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor/alice/My%20spaceship/sprites'))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })
    await flushPromises()
  })

  it('opens an existing project from the menu and changes its name', async () => {
    await signIn()
    vi.mocked(projectApis.isProjectNameTaken).mockResolvedValue(false)
    vi.mocked(projectApis.updateProject).mockImplementation(async (_owner, name, params) => ({
      ...makeProject(name),
      ...params
    }))
    const { wrapper, router } = await mountPages('/')
    await wrapper.get('[aria-label="Project menu"]').trigger('mouseenter')
    await vi.waitFor(() =>
      expect(wrapper.findAll('.ui-menu-item').some((item) => item.text() === 'Open project...')).toBe(true)
    )
    await wrapper
      .findAll('.ui-menu-item')
      .find((item) => item.text() === 'Open project...')!
      .trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Project open modal"]').exists()).toBe(true))
    const open = wrapper.get('[aria-label="Project open modal"]')
    await vi.waitFor(() => expect(open.text()).toContain('My spaceship'))
    await open.get('a[href="/editor/alice/My%20spaceship"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor/alice/My%20spaceship/sprites'))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })
    await wrapper.get('[aria-label="Project menu"]').trigger('mouseenter')
    await vi.waitFor(() =>
      expect(wrapper.findAll('.ui-menu-item').some((item) => item.text() === 'Modify project name')).toBe(true)
    )
    await wrapper
      .findAll('.ui-menu-item')
      .find((item) => item.text() === 'Modify project name')!
      .trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Project name warning modal"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Project name warning modal"] button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Project name modal"]').exists()).toBe(true))
    const rename = wrapper.get('[aria-label="Project name modal"]')
    await rename.get('[aria-label="Project name input"] input').setValue('New-flight')
    await rename.get('form').trigger('submit')
    await vi.waitFor(() =>
      expect(projectApis.updateProject).toHaveBeenCalledWith('alice', 'My spaceship', { name: 'New-flight' })
    )
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor/alice/New-flight/sprites'))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true))
  })
})
