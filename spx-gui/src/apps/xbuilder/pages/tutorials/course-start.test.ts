import { describe, expect, it, vi } from 'vitest'
import { setupPageTests, mountPages, signIn } from '@/apps/xbuilder/pages/test'
import * as copilotApis from '@/apis/copilot'
import * as courseApis from '@/apis/course'

describe('course start', () => {
  setupPageTests()

  it('starts a course in the editor and displays the copilot guidance', async () => {
    await signIn()
    vi.mocked(courseApis.getCourse).mockResolvedValue({
      id: 'first-flight',
      owner: 'alice',
      title: 'First flight',
      thumbnail: '',
      entrypoint: '/editor/alice/first-flight',
      prompt: 'Build a spaceship'
    })
    vi.mocked(copilotApis.generateCopilotMessage).mockImplementation(async function* (messages) {
      const nextStep = messages.some(
        (message) => message.role === 'user' && message.content.text.includes('I did what you asked.')
      )
      yield {
        type: 'text_delta',
        data: { text: nextStep ? 'Now move your spaceship.' : 'Welcome! Start by adding a spaceship.' }
      }
      yield { type: 'done', data: { finishReason: 'stop' } }
    })
    const { wrapper, router } = await mountPages('/course-series/space')
    await vi.waitFor(() => expect(wrapper.find('a[href="/course/space/first-flight/start"]').exists()).toBe(true))
    await wrapper.get('a[href="/course/space/first-flight/start"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/editor/alice/first-flight/sprites'))
    await vi.waitFor(() => expect(wrapper.text()).toContain('Welcome! Start by adding a spaceship.'), { timeout: 4000 })
    await vi.waitFor(() => expect(wrapper.findAll('button').some((button) => button.text() === 'Next step')).toBe(true))
    const next = wrapper.findAll('button').find((button) => button.text() === 'Next step')!
    await next.trigger('click')
    await vi.waitFor(() =>
      expect(copilotApis.generateCopilotMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.objectContaining({
              text: expect.stringContaining('I did what you asked. Tell me what to do next.')
            })
          })
        ]),
        expect.anything()
      )
    )
    await vi.waitFor(() => expect(wrapper.text()).toContain('Now move your spaceship.'))
    await vi.waitFor(() => expect(wrapper.findAll('button').some((button) => button.text() === 'Next step')).toBe(true))
    expect(copilotApis.generateCopilotMessage).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.objectContaining({ text: expect.stringContaining('Build a spaceship') })
        })
      ]),
      expect.anything()
    )
  })
})
