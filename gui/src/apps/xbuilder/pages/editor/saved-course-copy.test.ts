import { describe, expect, it, vi } from 'vitest'
import { makeProject, mountPages, setupPageTests, signIn } from '@/apps/xbuilder/pages/test'
import * as courseApis from '@/apis/course'
import * as projectApis from '@/apis/project'
import { cloudHelpers } from '@/models/common/cloud'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'

describe('opening a saved course project copy', () => {
  setupPageTests()

  it('opens the server-named copy after saving from the Guided project menu', async () => {
    await signIn()
    const [course] = (await courseApis.listCourses()).data
    vi.mocked(courseApis.getCourse).mockResolvedValue(course)
    sessionStorage.setItem('spx-gui-tutorial-course', JSON.stringify(course.id))
    sessionStorage.setItem('spx-gui-tutorial-series', JSON.stringify('space'))
    vi.mocked(projectApis.isProjectNameTaken).mockResolvedValue(false)
    const save = vi.spyOn(cloudHelpers, 'save').mockResolvedValue({
      files: {},
      metadata: { ...makeProject('my-copy'), owner: 'Alice', thumbnail: null }
    })
    const { router, wrapper } = await mountPages('/editor/alice/First%20flight')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })
    await wrapper.get('[aria-label="Project menu"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Save as my project"]').exists()).toBe(true))
    await wrapper.get('[aria-label="Save as my project"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Create project modal"]').exists()).toBe(true))
    const modal = wrapper.get('[aria-label="Create project modal"]')
    await modal.get('[aria-label="Project name input"] input').setValue('My-Copy')
    await modal.get('form').trigger('submit')

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor/Alice/my-copy/sprites'))
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ owner: 'alice', name: 'My-Copy' }) })
    )
  })

  it('announces the copy only after its editor loads', async () => {
    await signIn()
    const project = makeProject('My first flight')
    const path = '/editor/alice/My%20first%20flight'
    const { router, wrapper } = await mountPages('/course-series/space')
    let finishLoading!: (value: typeof project) => void
    vi.mocked(projectApis.getProject).mockReturnValueOnce(
      new Promise((resolve) => {
        finishLoading = resolve
      })
    )

    await router.push({ path, state: { savedCourseCopy: path } })
    await vi.waitFor(() =>
      expect(projectApis.getProject).toHaveBeenCalledWith('alice', project.name, expect.anything())
    )
    const notice = 'You’re now editing your copy. You can open it again from My projects in your profile menu.'
    expect(wrapper.text()).not.toContain(notice)
    finishLoading(project)
    await vi.waitFor(() => expect(wrapper.text()).toContain(notice))
    expect(wrapper.getComponent(EditorContextProvider).props('project').displayName).toBe(project.displayName)
    expect(router.options.history.state.savedCourseCopy).toBeFalsy()
  })
})
