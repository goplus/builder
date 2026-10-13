import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import * as userApis from '@/apis/user'

describe('user profile', () => {
  setupPageTests()

  it('shows a user profile and navigates between their projects and likes', async () => {
    const { wrapper, router } = await mountPages('/user/alice')
    await vi.waitFor(() => expect(wrapper.text()).toContain('First flight'))
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Moon landing')
    await wrapper.get('a[aria-label="Projects link"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/user/alice/projects'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('First flight'))
    await wrapper.get('a[aria-label="Likes link"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/user/alice/likes'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Moon landing'))
  })

  it('edits the signed-in user profile and displays the saved values', async () => {
    await signIn()
    const user = await userApis.getSignedInUser()
    vi.mocked(userApis.updateSignedInUser).mockImplementation(async (params) => {
      const updated = { ...user, ...params }
      vi.mocked(userApis.getUser).mockResolvedValue(updated)
      return updated
    })
    const { wrapper } = await mountPages('/user/alice')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Edit profile button"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Edit profile button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Edit profile modal"]').exists()).toBe(true))
    const modal = wrapper.get('[aria-label="Edit profile modal"]')
    await modal.get('[aria-label="Display name input"] input').setValue('Alice the pilot')
    await modal.get('[aria-label="About me input"] textarea').setValue('I make space games')
    await modal.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Edit profile modal"]').exists()).toBe(false))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Alice the pilot'))
    expect(wrapper.text()).toContain('I make space games')
    expect(userApis.updateSignedInUser).toHaveBeenCalledWith({
      displayName: 'Alice the pilot',
      description: 'I make space games'
    })
  })

  it('follows a user, browses their paginated followers and unfollows them', async () => {
    await signIn()
    const alice = await userApis.getUser('alice')
    const bob = { ...alice, id: 'bob', username: 'bob', displayName: 'Bob' }
    vi.mocked(userApis.getUser).mockImplementation(async (name) => (name === 'bob' ? bob : alice))
    let following = false
    vi.mocked(userApis.isFollowing).mockImplementation(async () => following)
    vi.mocked(userApis.follow).mockImplementation(async () => {
      following = true
    })
    vi.mocked(userApis.unfollow).mockImplementation(async () => {
      following = false
    })
    vi.mocked(userApis.listUserFollowers).mockImplementation(async (_name, params) => ({
      total: 9,
      data: [{ ...alice, displayName: params?.pageIndex === 2 ? 'Another pilot' : 'Alice' }]
    }))
    vi.mocked(userApis.listUserFollowing).mockResolvedValue({ total: 1, data: [alice] })
    const { wrapper, router } = await mountPages('/user/bob')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Follow button"]').text()).toBe('Follow'))
    await wrapper.get('[aria-label="Follow button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('[aria-label="Follow button"]').text()).toBe('Unfollow'))
    expect(userApis.follow).toHaveBeenCalledWith('bob')
    await wrapper.get('a[aria-label="Followers link"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('My followers'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '2')!
      .trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.query.p).toBe('2'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Another pilot'))
    expect(userApis.listUserFollowers).toHaveBeenLastCalledWith(
      'bob',
      expect.objectContaining({ pageIndex: 2, pageSize: 8 })
    )
    await wrapper.get('a[aria-label="Following link"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain("Users I'm following"))
    expect(wrapper.find('a[href="/user/alice"]').exists()).toBe(true)
    await wrapper.get('[aria-label="Follow button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('[aria-label="Follow button"]').text()).toBe('Follow'))
    expect(userApis.unfollow).toHaveBeenCalledWith('bob')
  })
})
