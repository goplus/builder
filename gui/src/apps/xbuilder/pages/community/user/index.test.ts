import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn, makeProject } from '@/apps/xbuilder/pages/test'
import * as userApis from '@/apis/user'
import * as projectApis from '@/apis/project'
import ProjectItem from '@/components/project/ProjectItem.vue'

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

  it('returns to the previous projects page when deletion empties the current page', async () => {
    await signIn()
    let projectDeleted = false
    vi.mocked(projectApis.listSignedInUserProjects).mockImplementation(async (params) => {
      if (params?.pageIndex === 2 && !projectDeleted) {
        return { total: 9, data: [makeProject('Last project')] }
      }
      if (params?.pageIndex === 2) return { total: 8, data: [] }
      return { total: 8, data: [makeProject('Remaining project')] }
    })

    const { wrapper, router } = await mountPages('/user/alice/projects?p=2&o=likes')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Last project'))

    projectDeleted = true
    wrapper.findComponent(ProjectItem).vm.$emit('removed')

    await vi.waitFor(() => expect(router.currentRoute.value.query.p).toBeUndefined())
    await vi.waitFor(() => expect(wrapper.text()).toContain('Remaining project'))
    expect(router.currentRoute.value.query.o).toBe('likes')
    expect(projectApis.listSignedInUserProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageIndex: 1, pageSize: 8, orderBy: 'likeCount', sortOrder: 'desc' })
    )
  })

  it('returns to the immediately previous page from a later page', async () => {
    await signIn()
    let projectDeleted = false
    vi.mocked(projectApis.listSignedInUserProjects).mockImplementation(async (params) => {
      if (params?.pageIndex === 4 && !projectDeleted) {
        return { total: 25, data: [makeProject('Last page project')] }
      }
      if (params?.pageIndex === 4) return { total: 24, data: [] }
      if (params?.pageIndex === 3) return { total: 24, data: [makeProject('Previous page project')] }
      return { total: 24, data: [] }
    })

    const { wrapper, router } = await mountPages('/user/alice/projects?p=4')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Last page project'))

    projectDeleted = true
    wrapper.findComponent(ProjectItem).vm.$emit('removed')

    await vi.waitFor(() => expect(router.currentRoute.value.query.p).toBe('3'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Previous page project'))
    expect(projectApis.listSignedInUserProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageIndex: 3, pageSize: 8 })
    )
  })

  it('keeps the current projects page when it still has projects after deletion', async () => {
    await signIn()
    let projectDeleted = false
    vi.mocked(projectApis.listSignedInUserProjects).mockImplementation(async (params) => {
      if (params?.pageIndex === 2 && !projectDeleted) {
        return { total: 9, data: [makeProject('Project one'), makeProject('Project two')] }
      }
      if (params?.pageIndex === 2) return { total: 9, data: [makeProject('Project two')] }
      return { total: 9, data: [makeProject('Project on page one')] }
    })

    const { wrapper, router } = await mountPages('/user/alice/projects?p=2')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Project one'))

    projectDeleted = true
    wrapper.findComponent(ProjectItem).vm.$emit('removed')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Project two'))
    expect(router.currentRoute.value.query.p).toBe('2')
    expect(projectApis.listSignedInUserProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({ pageIndex: 2, pageSize: 8 })
    )
  })

  it('shows the empty state when the final project is deleted', async () => {
    await signIn()
    let projectDeleted = false
    vi.mocked(projectApis.listSignedInUserProjects).mockImplementation(async () =>
      projectDeleted ? { total: 0, data: [] } : { total: 1, data: [makeProject('Only project')] }
    )

    const { wrapper, router } = await mountPages('/user/alice/projects')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Only project'))

    projectDeleted = true
    wrapper.findComponent(ProjectItem).vm.$emit('removed')

    await vi.waitFor(() => expect(wrapper.text()).toContain('No projects'))
    expect(router.currentRoute.value.query.p).toBeUndefined()
  })
})
