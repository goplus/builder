import { afterEach, describe, expect, it, vi } from 'vitest'
import { client } from './common'
import {
  generatePlaygroundCourseCopilotContext,
  getCourse,
  listCourses,
  listSignedInUserCourses,
  type Course
} from './course'

function makeCourses(): Course[] {
  return [
    {
      id: 'guided/course',
      owner: 'teacher',
      kind: 'guided',
      title: 'Create a project',
      thumbnail: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      content: { entrypoint: '/', prompt: 'Guide the learner.' }
    },
    {
      id: 'playground/course',
      owner: 'teacher',
      kind: 'playground',
      title: 'Move a sprite',
      thumbnail: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      content: { 'main_course.gox': 'https://example.com/main_course.gox' }
    }
  ]
}

describe('Course APIs', () => {
  afterEach(() => vi.restoreAllMocks())

  it('loads both course kinds with encoded IDs and their current content shapes', async () => {
    const get = vi.spyOn(client, 'get')
    const signal = new AbortController().signal
    for (const course of makeCourses()) {
      get.mockResolvedValueOnce(course)
      await expect(getCourse(course.id, signal)).resolves.toEqual(course)
      expect(get).toHaveBeenLastCalledWith(`/courses/${course.kind}%2Fcourse`, undefined, { signal })
    }
  })

  it.each([
    { list: listCourses, path: '/courses' },
    { list: listSignedInUserCourses, path: '/user/courses' }
  ])('loads a page from $path with course content and ordering', async ({ list, path }) => {
    const result = { total: 12, data: makeCourses() }
    const get = vi.spyOn(client, 'get').mockResolvedValue(result)
    const signal = new AbortController().signal
    const params = { courseSeriesID: 'series', pageIndex: 2, pageSize: 2, orderBy: 'sequenceInCourseSeries' as const }
    await expect(list(params, signal)).resolves.toEqual(result)
    expect(get).toHaveBeenCalledWith(path, params, { signal })
  })
})

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
