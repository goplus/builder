import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import { PlaygroundCourseCreation } from './creation'

const { addCourse, saveFiles, appendCourseToSeries } = vi.hoisted(() => ({
  addCourse: vi.fn(),
  saveFiles: vi.fn(),
  appendCourseToSeries: vi.fn()
}))

vi.mock('@/apis/course', () => ({ addCourse }))
vi.mock('@/models/common/cloud', () => ({ saveFiles }))
vi.mock('./series', () => ({ appendCourseToSeries }))

const course = { id: '2345', kind: 'playground', title: 'New course' } as PlaygroundCourse
const series = { id: '39', kind: 'playground', courseIDs: ['2337', '2345'] } as CourseSeries
const params = { title: 'New course', thumbnail: 'kodo://bucket/thumbnail', courseSeriesID: '39' }

describe('PlaygroundCourseCreation', () => {
  beforeEach(() => {
    addCourse.mockReset().mockResolvedValue(course)
    saveFiles.mockReset().mockResolvedValue({ fileCollection: { 'index.json': 'data:,' }, fileCollectionHash: '' })
    appendCourseToSeries.mockReset().mockResolvedValue(series)
  })

  it('creates the course from its starter files and puts it in the series', async () => {
    const buildFiles = vi.fn().mockResolvedValue({})
    const creation = new PlaygroundCourseCreation(buildFiles)

    await expect(creation.run(params)).resolves.toEqual({ course, courseSeries: series })

    expect(addCourse).toHaveBeenCalledWith({
      kind: 'playground',
      title: 'New course',
      thumbnail: 'kodo://bucket/thumbnail',
      content: { 'index.json': 'data:,' }
    })
    expect(appendCourseToSeries).toHaveBeenCalledWith('39', '2345')
  })

  it('does not create a second course when only adding it to the series failed', async () => {
    const buildFiles = vi.fn().mockResolvedValue({})
    const creation = new PlaygroundCourseCreation(buildFiles)
    appendCourseToSeries.mockRejectedValueOnce(new Error('network'))

    // The course exists by now, and the author is told so rather than that creating it failed.
    await expect(creation.run(params)).rejects.toMatchObject({
      userMessage: { zh: expect.stringContaining('已经创建') }
    })
    expect(creation.createdCourse).toBe(course)

    // Clicking "Create" again only repeats what is left.
    await expect(creation.run(params)).resolves.toEqual({ course, courseSeries: series })
    expect(buildFiles).toHaveBeenCalledTimes(1)
    expect(saveFiles).toHaveBeenCalledTimes(1)
    expect(addCourse).toHaveBeenCalledTimes(1)
    expect(appendCourseToSeries).toHaveBeenCalledTimes(2)
  })

  it('starts over when creating the course itself failed', async () => {
    const creation = new PlaygroundCourseCreation(vi.fn().mockResolvedValue({}))
    addCourse.mockRejectedValueOnce(new Error('quota'))

    await expect(creation.run(params)).rejects.toThrow('quota')
    expect(creation.createdCourse).toBeNull()
    expect(appendCourseToSeries).not.toHaveBeenCalled()

    await expect(creation.run(params)).resolves.toEqual({ course, courseSeries: series })
    expect(addCourse).toHaveBeenCalledTimes(2)
  })
})
