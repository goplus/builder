import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn, makeProject } from '@/apps/xbuilder/pages/test'
import { ExploreOrder } from '@/apis/project'
import * as projectApis from '@/apis/project'
import { accountOAuthApisForXBuilder } from '@/apis/account/oauth'
import * as userApis from '@/apis/user'
import { mockCompleteSignIn } from '@/stores/user/test'
import NavbarProfile from '@/components/navbar/NavbarProfile.vue'

describe('community home', () => {
  setupPageTests()

  it('keeps the signed-in navigation available when loading user information fails', async () => {
    await signIn()
    vi.mocked(userApis.getSignedInUser).mockRejectedValue(new TypeError('offline'))
    const { wrapper, router } = await mountPages('/')
    await flushPromises()
    const profile = wrapper.getComponent(NavbarProfile)
    await profile.get('.h-full').trigger('mouseenter')
    await vi.waitFor(() =>
      expect(wrapper.findAll('.ui-menu-item').some((item) => item.text() === 'Profile')).toBe(true)
    )
    await wrapper
      .findAll('.ui-menu-item')
      .find((item) => item.text() === 'Profile')!
      .trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/user/alice'))
  })

  it('reloads personalized lists for account changes and clears them on sign-out', async () => {
    await signIn()
    const alice = await userApis.getSignedInUser()
    const { wrapper, signedIn } = await mountPages('/')
    await vi.waitFor(() => expect(wrapper.text()).toContain('My spaceship'))
    const countFollowed = () =>
      vi
        .mocked(projectApis.exploreProjects)
        .mock.calls.filter(([params]) => params.order === ExploreOrder.FollowingCreated).length
    const before = {
      mine: vi.mocked(projectApis.listSignedInUserProjects).mock.calls.length,
      followed: countFollowed()
    }

    vi.mocked(userApis.updateSignedInUser).mockResolvedValue({ ...alice, displayName: 'Updated Alice' })
    await signedIn.updateProfile({ displayName: 'Updated Alice' })
    await flushPromises()
    expect(projectApis.listSignedInUserProjects).toHaveBeenCalledTimes(before.mine)
    expect(countFollowed()).toBe(before.followed)

    vi.mocked(userApis.getSignedInUser).mockResolvedValue({ ...alice, username: 'bob', displayName: 'Bob' })
    await mockCompleteSignIn(signedIn, 'bob-token')
    await vi.waitFor(() => expect(projectApis.listSignedInUserProjects).toHaveBeenCalledTimes(before.mine + 1))
    expect(countFollowed()).toBe(before.followed + 1)
    expect(wrapper.find('a[href="/user/bob/projects"]').exists()).toBe(true)

    vi.spyOn(accountOAuthApisForXBuilder, 'revokeToken').mockResolvedValue()
    await signedIn.signOut()
    await flushPromises()
    expect(wrapper.find('[aria-label="Your projects"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Following created"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/user/bob/projects"]').exists()).toBe(false)
    expect(projectApis.listSignedInUserProjects).toHaveBeenCalledTimes(before.mine + 1)
    expect(countFollowed()).toBe(before.followed + 1)
  })

  it('keeps homepage lists and the New project modal stable during credential refresh', async () => {
    let now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    await signIn()
    const state = JSON.parse(localStorage.getItem('builder-user')!)
    localStorage.setItem(
      'builder-user',
      JSON.stringify({ ...state, accessTokenExpiresAt: now + 120_000, refreshToken: 'test-refresh-token' })
    )
    window.dispatchEvent(new StorageEvent('storage', { key: 'builder-user' }))
    const refresh = vi.spyOn(accountOAuthApisForXBuilder, 'refreshToken').mockResolvedValue({
      access_token: 'rotated-token',
      expires_in: 3600,
      refresh_token: 'rotated-refresh-token',
      token_type: 'Bearer'
    })
    const { wrapper, signedIn } = await mountPages('/')
    await vi.waitFor(() => expect(wrapper.text()).toContain('My spaceship'))
    const count = (order: ExploreOrder) =>
      vi.mocked(projectApis.exploreProjects).mock.calls.filter(([params]) => params.order === order).length
    const before = {
      mine: vi.mocked(projectApis.listSignedInUserProjects).mock.calls.length,
      likes: count(ExploreOrder.MostLikes),
      remixes: count(ExploreOrder.MostRemixes),
      followed: count(ExploreOrder.FollowingCreated)
    }
    now += 65_000
    await wrapper.get('[aria-label="Project menu"]').trigger('mouseenter')
    await vi.waitFor(() =>
      expect(wrapper.findAll('.ui-menu-item').some((item) => item.text() === 'New project...')).toBe(true)
    )
    await wrapper
      .findAll('.ui-menu-item')
      .find((item) => item.text() === 'New project...')!
      .trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Create project modal"]').exists()).toBe(true))
    await signedIn.ensureAccessToken()
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    await flushPromises()
    const after = {
      mine: vi.mocked(projectApis.listSignedInUserProjects).mock.calls.length,
      likes: count(ExploreOrder.MostLikes),
      remixes: count(ExploreOrder.MostRemixes),
      followed: count(ExploreOrder.FollowingCreated)
    }
    expect(after.likes).toBe(before.likes)
    expect(after.remixes).toBe(before.remixes)
    expect(after.followed).toBe(before.followed)
    expect(after.mine).toBe(before.mine)
  })

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
