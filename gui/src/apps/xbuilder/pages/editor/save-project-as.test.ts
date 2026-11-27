import { describe, expect, it, vi } from 'vitest'
import { mountPages, setupPageTests, signIn } from '../test'
import { isProjectNameTaken } from '@/apis/project'
import { cloudHelpers } from '@/models/common/cloud'
import EditorNavbar from '@/components/editor/navbar/EditorNavbar.vue'

describe('saving edits to another user’s project', () => {
  setupPageTests()

  async function editProject() {
    await signIn()
    const page = await mountPages('/editor/bob/source')
    const navbar = () => page.wrapper.getComponent(EditorNavbar)
    await vi.waitFor(() => expect(navbar().props('project')?.owner).toBe('bob'), { timeout: 4000 })
    const source = navbar().props('project')!
    source.stage.setCode('println "my edit"')
    await vi.waitFor(() => expect(navbar().props('state')!.editing.dirty).toBe(true))
    return { ...page, navbar }
  }

  it('lets the user keep editing when a direct link would discard their changes', async () => {
    const { router, wrapper, navbar } = await editProject()
    const navigation = router.push('/editor/alice/other')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Project edits will not be saved'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Keep editing')!
      .trigger('click')
    await navigation
    expect(navbar().props('project')!.stage.code).toBe('println "my edit"')
    expect(router.currentRoute.value.path).toContain('/editor/bob/source')
  })

  it('opens the named personal copy with the edited code', async () => {
    const { router, wrapper, navbar } = await editProject()
    vi.mocked(isProjectNameTaken).mockResolvedValue(false)
    vi.spyOn(cloudHelpers, 'save').mockImplementationOnce(async ({ files, metadata }) => {
      const copy = await cloudHelpers.load('alice', 'My-Copy')
      copy.metadata.displayName = metadata.displayName!
      copy.files = files
      vi.spyOn(cloudHelpers, 'load').mockResolvedValueOnce(copy)
      return { files, metadata: { ...copy.metadata, latestRelease: null } }
    })
    await wrapper.get('[aria-label="Project menu"]').trigger('click')
    const saveItem = () => wrapper.findAll('.ui-menu-item').find((item) => item.text() === 'Save as my project...')
    await vi.waitFor(() => expect(saveItem()).toBeDefined())
    await saveItem()!.trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Your copy will open in the editor'))
    const modal = wrapper.get('[aria-label="Create project modal"]')
    const nameInput = modal.get('input')
    expect(nameInput.element.value).toBe('source')
    await nameInput.setValue('My-Copy')
    await modal.get('form').trigger('submit')
    await vi.waitFor(() => expect(navbar().props('project')?.name).toBe('My-Copy'))
    expect(router.currentRoute.value.path).toContain('/editor/alice/My-Copy')
    expect(navbar().props('project')!.stage.code).toBe('println "my edit"')
    expect(navbar().text()).toContain('My-Copy')
    expect(wrapper.text()).toContain('My projects in your profile menu')
  })
})
