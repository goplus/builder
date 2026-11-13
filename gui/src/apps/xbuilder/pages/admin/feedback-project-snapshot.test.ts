import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, makeFeedback, signIn } from '@/apps/xbuilder/pages/test'
import { stringifyDataUrl } from '@/utils/universal-url'
import * as feedbackAdminApis from '@/apis/admin/feedback'
import * as projectApis from '@/apis/project'
import { localHelpers } from '@/models/common/local'
import EditorContextProvider from '@/components/editor/EditorContextProvider.vue'

const snapshotUrl = 'kodo://test/files/project-snapshot.json'
const snapshotWebUrl = 'https://assets.test/files/project-snapshot.json'
const snapshotCode = 'onStart => {\n\tprintln "from snapshot"\n}\n'

function mockFeedbackWithSnapshot(projectSnapshotUrl: string) {
  vi.mocked(feedbackAdminApis.getFeedback).mockResolvedValue(
    makeFeedback({
      context: {
        source: 'profileMenu',
        page: { path: '/editor/alice/space', language: 'en' },
        projectSnapshotUrl
      }
    })
  )
}

function mockSnapshotDownload() {
  const fetchMock = vi.mocked(globalThis.fetch)
  const fetchOther = fetchMock.getMockImplementation()!
  fetchMock.mockImplementation(async (input, init) => {
    if (input === snapshotWebUrl)
      return new Response(JSON.stringify({ files: { 'main.spx': stringifyDataUrl('text/plain', snapshotCode) } }))
    return fetchOther(input, init)
  })
}

describe('admin feedback project snapshot', () => {
  setupPageTests()

  it('opens the project snapshot of the feedback and keeps edits local', async () => {
    await signIn({ canManageFeedback: true })
    mockFeedbackWithSnapshot(snapshotUrl)
    mockSnapshotDownload()

    const { wrapper, router } = await mountPages('/admin/feedback/1/project-snapshot')
    await vi.waitFor(() => expect(wrapper.find('[aria-label="Stage overview"]').exists()).toBe(true), { timeout: 4000 })

    expect(feedbackAdminApis.getFeedback).toHaveBeenCalledWith('1')
    const project = wrapper.getComponent(EditorContextProvider).props('project')
    expect(project.stage.code).toBe(snapshotCode)
    expect(project.displayName).toBe('Project snapshot')

    project.stage.setCode('onStart => {}\n')
    const leaving = router.push('/')
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain('Project edits will not be saved if you leave now')
    )
    Array.from(document.body.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Keep editing')!
      .click()
    await leaving
    expect(router.currentRoute.value.path).toMatch(/^\/admin\/feedback\/1\/project-snapshot/)
    expect(localHelpers.load).not.toHaveBeenCalled()
    expect(localHelpers.save).not.toHaveBeenCalled()
    expect(projectApis.addProject).not.toHaveBeenCalled()
    expect(projectApis.updateProject).not.toHaveBeenCalled()
  })

  it('does not load a snapshot that is not a Kodo URL', async () => {
    await signIn({ canManageFeedback: true })
    const url = 'https://example.com/project-snapshot.json'
    mockFeedbackWithSnapshot(url)

    const { wrapper } = await mountPages('/admin/feedback/1/project-snapshot')

    await vi.waitFor(() => expect(wrapper.text()).toContain('No project snapshot is available for this feedback'))
    expect(globalThis.fetch).not.toHaveBeenCalledWith(url, expect.anything())
  })
})
