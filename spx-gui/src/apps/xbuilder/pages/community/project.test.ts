import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn, makeProject } from '@/apps/xbuilder/pages/test'
import * as projectApis from '@/apis/project'
import * as releaseApis from '@/apis/project-release'

describe('community project', () => {
  setupPageTests()

  it('loads a public project with its description, instructions and release history', async () => {
    const { wrapper } = await mountPages('/project/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('First flight'))
    expect(wrapper.text()).toContain('A game about exploring')
    expect(wrapper.text()).toContain('Use the arrow keys')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No release history yet'))
    expect(wrapper.get('button[aria-label="Run button"]').text()).toContain('Run')
    await wrapper.get('button[aria-label="Share button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Sharing link input"] input').exists()).toBe(true))
    const link = wrapper.get<HTMLInputElement>('[aria-label="Sharing link input"] input').element.value
    expect(link).toBe(`${location.origin}/project/alice/First%20flight`)
    await wrapper.get('button[aria-label="Copy button"]').trigger('click')
    await vi.waitFor(async () => expect(await navigator.clipboard.readText()).toBe(link))
  })

  it('remixes a public project and opens the new project in the editor', async () => {
    await signIn()
    vi.mocked(projectApis.isProjectNameTaken).mockResolvedValue(false)
    vi.mocked(projectApis.addProject).mockResolvedValue(makeProject('My-remix'))
    vi.mocked(releaseApis.listProjectReleases).mockResolvedValue({
      total: 1,
      data: [
        {
          id: 'release',
          projectFullName: 'bob/Space',
          name: '1.0.0',
          description: 'First release',
          files: {},
          thumbnail: '',
          remixCount: 0,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z'
        }
      ]
    })
    const { wrapper, router } = await mountPages('/project/bob/Space')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Remix button"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Remix button"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Create project modal"]').exists()).toBe(true))
    const modal = wrapper.get('[aria-label="Create project modal"]')
    await modal.get('[aria-label="Project name input"] input').setValue('My-remix')
    await modal.get('form').trigger('submit')
    await vi.waitFor(() =>
      expect(projectApis.addProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My-remix', remixSource: 'bob/Space' })
      )
    )
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor/alice/My-remix/sprites'))
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })
  })

  it('likes and unlikes a public project', async () => {
    await signIn()
    let liking = false
    vi.mocked(projectApis.isLiking).mockImplementation(async () => liking)
    vi.mocked(projectApis.likeProject).mockImplementation(async () => {
      liking = true
    })
    vi.mocked(projectApis.unlikeProject).mockImplementation(async () => {
      liking = false
    })
    const { wrapper } = await mountPages('/project/bob/Space')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Like button"]').exists()).toBe(true))
    const like = wrapper.get('[aria-label="Like button"]')
    await like.trigger('click')
    await vi.waitFor(() => expect(projectApis.likeProject).toHaveBeenCalledWith('bob', 'Space'))
    await vi.waitFor(() => expect(like.classes()).toContain('text-red-main!'))
    await like.trigger('click')
    await vi.waitFor(() => expect(projectApis.unlikeProject).toHaveBeenCalledWith('bob', 'Space'))
    await vi.waitFor(() => expect(like.classes()).not.toContain('text-red-main!'))
  })
})
