import { afterEach, describe, expect, it, vi } from 'vitest'
import { client } from './common'
import { generatePlaygroundCourseCopilotContext } from './course'

describe('generatePlaygroundCourseCopilotContext', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('waits for the model longer than the default request timeout', async () => {
    const post = vi.spyOn(client, 'post').mockResolvedValue({ copilotContext: 'Generated.' })
    const signal = new AbortController().signal

    await generatePlaygroundCourseCopilotContext({ title: 'Move Lita', thumbnail: '', content: {} }, signal)

    const options = post.mock.calls[0][2]
    expect(options?.signal).toBe(signal)
    // The server bounds the generation at two minutes; the default client timeout is only ten seconds.
    expect(options?.timeout).toBeGreaterThan(2 * 60 * 1000)
  })
})
