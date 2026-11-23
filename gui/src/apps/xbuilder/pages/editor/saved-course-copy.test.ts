import { describe, expect, it, vi } from 'vitest'
import { makeProject, mountPages, setupPageTests, signIn } from '@/apps/xbuilder/pages/test'
import * as projectApis from '@/apis/project'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'

describe('opening a saved course project copy', () => {
  setupPageTests()

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
