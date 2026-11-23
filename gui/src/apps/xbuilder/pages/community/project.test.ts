import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { setupPageTests, mountPages, signIn, makeProject } from '@/apps/xbuilder/pages/test'
import * as projectApis from '@/apis/project'
import * as releaseApis from '@/apis/project-release'
import * as userApis from '@/apis/user'
import ProjectRunnerSurface from '@/components/project/runner/ProjectRunnerSurface.vue'

describe('community project', () => {
  setupPageTests()

  it('opens fullscreen before running and starts from its centered run button', async () => {
    const { wrapper } = await mountPages('/project/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.findComponent(ProjectRunnerSurface).exists()).toBe(true))
    const surface = wrapper.getComponent(ProjectRunnerSurface)
    const exposed = surface.vm.$.exposed as InstanceType<typeof ProjectRunnerSurface>
    const run = vi.spyOn(exposed, 'run').mockResolvedValue('files-hash')
    const enter = wrapper.get('button[aria-label="Enter full screen button"]')
    const share = wrapper.get('button[aria-label="Share button"]')
    expect(share.element.previousElementSibling).toBe(enter.element)

    await enter.trigger('click', { detail: 1 })
    expect(surface.props('fullscreen')).toBe(true)
    expect(surface.props('runnerState')).toBe('initial')
    expect(run).not.toHaveBeenCalled()

    await surface.get('.runner-area button[aria-label="Run button"]').trigger('click')
    await flushPromises()
    expect(run).toHaveBeenCalledOnce()
    expect(surface.props('runnerState')).toBe('running')
    expect(surface.props('fullscreen')).toBe(true)
  })

  it('returns to the initial preview when exiting fullscreen before running', async () => {
    const { wrapper } = await mountPages('/project/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.findComponent(ProjectRunnerSurface).exists()).toBe(true))
    const surface = wrapper.getComponent(ProjectRunnerSurface)
    const exposed = surface.vm.$.exposed as InstanceType<typeof ProjectRunnerSurface>
    const run = vi.spyOn(exposed, 'run')
    const enter = wrapper.get<HTMLButtonElement>('button[aria-label="Enter full screen button"]')

    await enter.trigger('click', { detail: 1 })
    await vi.waitFor(() => expect(surface.find('.fullscreen-exit').exists()).toBe(true))
    await surface.get('.fullscreen-exit').trigger('click')
    await vi.waitFor(() => expect(surface.classes()).not.toContain('fullscreen'))

    expect(surface.props('fullscreen')).toBe(false)
    expect(surface.props('runnerState')).toBe('initial')
    expect(surface.find('.runner-area button[aria-label="Run button"]').exists()).toBe(true)
    expect(document.activeElement).toBe(enter.element)
    expect(run).not.toHaveBeenCalled()
  })

  it('keeps the sign-in prompt in fullscreen and requires sign-in for its toolbar run action', async () => {
    const { wrapper, signedIn } = await mountPages('/project/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.findComponent(ProjectRunnerSurface).exists()).toBe(true))
    const surface = wrapper.getComponent(ProjectRunnerSurface)
    surface.props('project').stage.setCode('var player ai.Player')
    const exposed = surface.vm.$.exposed as InstanceType<typeof ProjectRunnerSurface>
    const run = vi.spyOn(exposed, 'run')
    const signIn = vi.spyOn(signedIn, 'signIn').mockResolvedValue()
    await flushPromises()

    await wrapper.get('button[aria-label="Enter full screen button"]').trigger('click', { detail: 1 })
    const gameArea = surface.get('.runner-area')
    expect(gameArea.text()).toContain('This game requires sign-in before playing')
    expect(gameArea.find('button[aria-label="Run button"]').exists()).toBe(false)
    await gameArea.get('button[aria-label="Sign in button"]').trigger('click')
    expect(signIn).toHaveBeenCalledOnce()

    await vi.waitFor(() => expect(surface.find('.toolbar-zone').exists()).toBe(true))
    await surface.get('.toolbar-zone button[aria-label="Run button"]').trigger('click')
    await flushPromises()
    expect(signIn).toHaveBeenCalledTimes(2)
    expect(run).not.toHaveBeenCalled()
    expect(surface.props('runnerState')).toBe('initial')
    expect(surface.props('fullscreen')).toBe(true)
    expect(surface.get('.runner-area').text()).toContain('This game requires sign-in before playing')
  })

  it('passes fullscreen button activation and its opener to the runner surface', async () => {
    const { wrapper } = await mountPages('/project/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.findComponent(ProjectRunnerSurface).exists()).toBe(true))
    const surface = wrapper.getComponent(ProjectRunnerSurface)
    const exposed = surface.vm.$.exposed as InstanceType<typeof ProjectRunnerSurface>
    vi.spyOn(exposed, 'run').mockResolvedValue('files-hash')
    const enterFullscreen = vi.spyOn(exposed, 'enterFullscreen').mockImplementation((event: MouseEvent) => ({
      opener: event.currentTarget,
      detail: event.detail
    }))
    await wrapper.get('button[aria-label="Run button"]').trigger('click')
    await flushPromises()
    const button = wrapper.get('button[aria-label="Enter full screen button"]')

    for (const detail of [0, 1]) {
      const event = new MouseEvent('click', { bubbles: true, detail })
      button.element.dispatchEvent(event)
      expect(enterFullscreen).toHaveBeenLastCalledWith(event)
      expect(enterFullscreen.mock.results.at(-1)?.value).toEqual({ opener: button.element, detail })
    }
    expect(enterFullscreen).toHaveBeenCalledTimes(2)
  })

  it('records views using local identity while user information is still loading', async () => {
    await signIn()
    vi.mocked(userApis.getSignedInUser).mockReturnValue(new Promise(() => {}))
    const { wrapper } = await mountPages('/project/alice/First%20flight')
    const errorHandler = vi.fn()
    wrapper.vm.$.appContext.config.errorHandler = errorHandler
    await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('First flight'))
    await flushPromises()
    wrapper.unmount()
    await flushPromises()
    expect(projectApis.recordProjectView).toHaveBeenCalledExactlyOnceWith('alice', 'First flight')
    expect(errorHandler).not.toHaveBeenCalled()
  })

  it('records views on project changes rather than authentication changes', async () => {
    const { wrapper, router } = await mountPages('/project/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('First flight'))
    await flushPromises()
    expect(projectApis.recordProjectView).not.toHaveBeenCalled()
    await signIn()
    await flushPromises()
    expect(projectApis.recordProjectView).not.toHaveBeenCalled()
    await router.push('/project/alice/Next')
    await vi.waitFor(() => expect(projectApis.recordProjectView).toHaveBeenCalledWith('alice', 'Next'))
    expect(projectApis.recordProjectView).toHaveBeenCalledOnce()
  })

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
