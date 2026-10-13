import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { zip, unzip, type Zippable } from '@/utils/zip'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { addCourse, deleteCourse, getCourse, type GuidedCourse, type PlaygroundCourse } from '@/apis/course'
import {
  addCourseSeries,
  getCourseSeries,
  listSignedInUserCourseSeries,
  updateCourseSeries,
  type CourseSeries
} from '@/apis/course-series'
import { deleteProject, getProject, ProjectType, updateProject, Visibility, type ProjectData } from '@/apis/project'
import { createProjectRelease, type ProjectRelease } from '@/apis/project-release'
import { cloudHelpers, createFileWithUniversalUrl, saveFile, saveFiles } from '@/models/common/cloud'
import { File as LazyFile, toText } from '@/models/common/file'
import { DefaultException } from '@/utils/exception'
import { xbpHelpers } from '@/models/common/xbp'
import {
  exportCourseSeriesFile,
  importCourseSeriesFile,
  importCourseSeriesFileAsNew,
  inspectCourseSeriesFileImport
} from './course-series-file'

dayjs.extend(utc)
dayjs.extend(timezone)

vi.mock('@/apis/course', () => ({
  getCourse: vi.fn(),
  addCourse: vi.fn(),
  deleteCourse: vi.fn(),
  isGuidedCourse: (course: GuidedCourse) => course.kind === 'guided',
  isPlaygroundCourse: (course: PlaygroundCourse) => course.kind === 'playground'
}))

vi.mock('@/apis/course-series', () => ({
  addCourseSeries: vi.fn(),
  updateCourseSeries: vi.fn(),
  getCourseSeries: vi.fn(),
  listSignedInUserCourseSeries: vi.fn()
}))

vi.mock('@/apis/project', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/project')>()),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn()
}))

vi.mock('@/apis/project-release', () => ({
  createProjectRelease: vi.fn()
}))

vi.mock('@/models/common/cloud', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/models/common/cloud')>()),
  cloudHelpers: {
    load: vi.fn(),
    save: vi.fn()
  },
  createFileWithUniversalUrl: vi.fn(),
  saveFile: vi.fn(),
  saveFiles: vi.fn()
}))

vi.mock('@/models/common/xbp', () => ({
  xbpHelpers: {
    save: vi.fn(),
    load: vi.fn()
  }
}))

// The mocked APIs stand in for the store writes, so assertions can inspect them.
const writes = { updateCourseSeries, deleteCourse }

const existingSeries: CourseSeries = {
  id: 'series-id',
  owner: 'alice',
  kind: 'guided',
  title: '编程 课程',
  thumbnail: 'kodo://bucket/series-thumbnail.png',
  description: 'Course series description',
  order: 42,
  courseIDs: ['course-1'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
}

const existingCourse: GuidedCourse = {
  id: 'course-1',
  owner: 'curator',
  kind: 'guided',
  title: 'Course 1',
  thumbnail: 'kodo://bucket/course-thumbnail.png',
  content: { entrypoint: '/editor/curator/EntryProject/lesson?tab=code', prompt: 'Prompt' }
}

beforeEach(() => {
  vi.resetAllMocks()

  vi.mocked(getCourse).mockImplementation(async (id) => {
    if (id === existingCourse.id) return existingCourse
    return { ...existingCourse, id, title: `Old ${id}` }
  })
  vi.mocked(createFileWithUniversalUrl).mockImplementation((url) => {
    const data = new TextEncoder().encode(`content:${url}`)
    return new LazyFile(url.split('/').pop() ?? 'thumbnail.png', () => Promise.resolve(data.buffer), {
      type: 'image/png'
    })
  })
  vi.mocked(saveFile).mockImplementation(async (file) => `kodo://imported/${file.name}`)
  vi.mocked(saveFiles).mockImplementation(async (files) => ({
    fileCollection: Object.fromEntries(Object.keys(files).map((path) => [path, `kodo://imported/${path}`])),
    fileCollectionHash: 'hash'
  }))
  vi.mocked(deleteProject).mockResolvedValue(undefined)
  vi.mocked(cloudHelpers.load).mockImplementation(async (owner, name) => {
    return {
      metadata: {
        id: `project-${owner}-${name}`,
        owner,
        name,
        displayName: name,
        type: ProjectType.Game,
        visibility: Visibility.Public,
        description: '',
        instructions: '',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        revision: 1,
        files: {},
        thumbnail: '',
        remixedFrom: null,
        latestRelease: null,
        viewCount: 0,
        likeCount: 0,
        releaseCount: 0,
        remixCount: 0,
        isLiked: false,
        isMine: true,
        isFeatured: false,
        isPublished: true,
        aiDescription: '',
        extraSettings: {},
        aiDescriptionHash: null
      },
      files: {}
    } as unknown as Awaited<ReturnType<typeof cloudHelpers.load>>
  })
  vi.mocked(cloudHelpers.save).mockImplementation(
    async (serialized) =>
      ({
        ...serialized,
        metadata: { ...serialized.metadata, revision: 7 }
      }) as Awaited<ReturnType<typeof cloudHelpers.save>>
  )
  vi.mocked(xbpHelpers.save).mockImplementation(
    async (serialized) => new File([JSON.stringify(serialized.metadata)], `${serialized.metadata.name}.xbp`)
  )
  vi.mocked(xbpHelpers.load).mockImplementation(async (file) => {
    const name = file.name.replace(/\.xbp$/, '')
    return {
      metadata: {
        id: `source-${name}`,
        owner: 'curator',
        name,
        displayName: `Display ${name}`,
        type: ProjectType.Game,
        description: `Description ${name}`,
        instructions: `Instructions ${name}`,
        extraSettings: {},
        visibility: Visibility.Public
      },
      files: {}
    } as Awaited<ReturnType<typeof xbpHelpers.load>>
  })
  vi.mocked(getProject).mockRejectedValue(
    new ApiException(ApiExceptionCode.errorNotFound, 'Not found', {
      req: new Request('https://api.example.com/projects/alice/project')
    })
  )
  vi.mocked(addCourse).mockResolvedValue({ ...existingCourse, id: 'imported-course' })
  vi.mocked(updateCourseSeries).mockImplementation(async (id, params) => ({
    // A patch may carry any subset of the fields; whatever it leaves out stays as it was.
    ...existingSeries,
    id,
    owner: 'alice',
    ...params
  }))
  vi.mocked(addCourseSeries).mockImplementation(async (params) => ({
    id: 'created-series',
    owner: 'alice',
    createdAt: existingSeries.createdAt,
    updatedAt: existingSeries.updatedAt,
    ...params
  }))
  vi.mocked(deleteCourse).mockResolvedValue(undefined)
  // Read back after a failed series write: by default it did not take effect.
  vi.mocked(getCourseSeries).mockResolvedValue(existingSeries)
  vi.mocked(listSignedInUserCourseSeries).mockResolvedValue({ total: 0, data: [] })
  vi.mocked(updateProject).mockImplementation(
    async (owner, name) =>
      ({
        owner,
        name,
        revision: 8
      }) as Awaited<ReturnType<typeof updateProject>>
  )
  vi.mocked(createProjectRelease).mockResolvedValue({} as Awaited<ReturnType<typeof createProjectRelease>>)
})

const releaseA = {
  id: 'release-a',
  files: { 'main.spx': 'kodo://published/main.spx' },
  thumbnail: 'kodo://published/thumbnail.png'
} as unknown as ProjectRelease

/** EntryProject as `alice` has it before an import overwrites it. */
function projectData(overrides: Partial<ProjectData>) {
  return {
    id: 'project-entry',
    owner: 'alice',
    name: 'EntryProject',
    displayName: 'Entry',
    type: ProjectType.Game,
    revision: 5,
    files: { 'main.spx': 'kodo://draft/main.spx' },
    visibility: Visibility.Private,
    description: 'Old description',
    instructions: 'Old instructions',
    extraSettings: {},
    thumbnail: 'kodo://draft/thumbnail.png',
    latestRelease: null,
    ...overrides
  } as ProjectData
}

function mockCloudProjectSave(owner: string, name: string, revision: number) {
  vi.mocked(cloudHelpers.save).mockImplementationOnce(
    async (serialized) =>
      ({
        ...serialized,
        metadata: {
          ...serialized.metadata,
          owner,
          name,
          revision
        }
      }) as Awaited<ReturnType<typeof cloudHelpers.save>>
  )
}

describe('exportCourseSeriesFile', () => {
  it('exports a self-contained package with entrypoint projects', async () => {
    const file = await exportCourseSeriesFile(existingSeries)
    const unzipped = await unzip(new Uint8Array(await file.arrayBuffer()))
    const manifest = JSON.parse(new TextDecoder().decode(unzipped['course-series.json']!)) as Record<string, any>

    expect(file.name).toBe('编程 课程.xbcs.zip')
    expect(manifest.courseSeries).toMatchObject({
      kind: 'guided',
      title: existingSeries.title,
      description: existingSeries.description,
      thumbnail: { path: 'thumbnails/course-series.png' }
    })
    expect(manifest.courseSeries).not.toHaveProperty('order')
    expect(manifest.courses[0]).toEqual({
      title: existingCourse.title,
      content: existingCourse.content,
      thumbnail: { path: 'thumbnails/courses/0.png' }
    })
    expect(manifest.version).toBe(4)
    expect(manifest.projects.map((project: { fullName: string }) => project.fullName)).toEqual(['curator/EntryProject'])
    expect(Object.keys(unzipped)).toEqual(
      expect.arrayContaining([
        'course-series.json',
        'thumbnails/course-series.png',
        'thumbnails/courses/0.png',
        'projects/0.xbp'
      ])
    )
  })
})

describe('importCourseSeriesFile', () => {
  it('creates a new course series with complete imported content', async () => {
    const ctrl = new AbortController()

    await importCourseSeriesFileAsNew(
      await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
      'guided',
      'alice',
      ctrl.signal
    )

    expect(addCourseSeries).toHaveBeenCalledWith(
      {
        kind: 'guided',
        title: 'Imported series',
        thumbnail: 'kodo://imported/thumbnails/course-series.png',
        description: 'Imported description',
        order: 1,
        courseIDs: ['imported-course']
      },
      ctrl.signal
    )
    expect(updateCourseSeries).not.toHaveBeenCalled()
    expect(deleteCourse).not.toHaveBeenCalled()
  })

  it('rewrites exact editor project segment and preserves local order', async () => {
    const ctrl = new AbortController()

    await importCourseSeriesFile(
      existingSeries,
      await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
      'alice',
      writes,
      ctrl.signal
    )

    expect(addCourse).toHaveBeenCalledWith(
      {
        kind: 'guided',
        title: 'Imported course',
        thumbnail: 'kodo://imported/thumbnails/courses/0.png',
        content: {
          entrypoint: '/editor/alice/EntryProject/lesson?tab=code',
          prompt: 'Imported prompt'
        }
      },
      ctrl.signal
    )
    expect(updateCourseSeries).toHaveBeenCalledWith(
      existingSeries.id,
      expect.objectContaining({
        order: existingSeries.order,
        courseIDs: ['imported-course']
      }),
      ctrl.signal
    )
    expect(createProjectRelease).toHaveBeenCalledWith(
      'alice',
      'EntryProject',
      {
        name: expect.stringMatching(/^v0\.0\.0\+/),
        description: 'Imported from course series "Imported series"',
        projectRevision: 8
      },
      ctrl.signal
    )
  })

  it('uses the canonical project identity returned by the project save', async () => {
    vi.mocked(xbpHelpers.load).mockResolvedValueOnce({
      metadata: {
        displayName: 'Display EntryProject',
        type: ProjectType.Game,
        visibility: Visibility.Public
      },
      files: {}
    })
    mockCloudProjectSave('saved-owner', 'SavedProject', 7)

    await importCourseSeriesFile(
      existingSeries,
      await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
      'alice',
      writes
    )

    expect(updateProject).not.toHaveBeenCalled()
    expect(createProjectRelease).toHaveBeenCalledWith(
      'saved-owner',
      'SavedProject',
      expect.objectContaining({ projectRevision: 7 }),
      undefined
    )
    expect(addCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        content: { entrypoint: '/editor/saved-owner/SavedProject/lesson?tab=code', prompt: 'Imported prompt' }
      }),
      undefined
    )
  })

  it('uses the canonical project identity returned by the metadata update', async () => {
    mockCloudProjectSave('saved-owner', 'SavedProject', 7)
    vi.mocked(updateProject).mockResolvedValueOnce({
      owner: 'final-owner',
      name: 'FinalProject',
      revision: 8
    } as Awaited<ReturnType<typeof updateProject>>)

    await importCourseSeriesFile(
      existingSeries,
      await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
      'alice',
      writes
    )

    expect(updateProject).toHaveBeenCalledWith(
      'saved-owner',
      'SavedProject',
      {
        description: 'Description EntryProject',
        instructions: 'Instructions EntryProject',
        extraSettings: {}
      },
      undefined
    )
    expect(createProjectRelease).toHaveBeenCalledWith(
      'final-owner',
      'FinalProject',
      expect.objectContaining({ projectRevision: 8 }),
      undefined
    )
    expect(addCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        content: { entrypoint: '/editor/final-owner/FinalProject/lesson?tab=code', prompt: 'Imported prompt' }
      }),
      undefined
    )
  })

  it('does not rewrite longer project names that only share a prefix', async () => {
    await importCourseSeriesFile(
      existingSeries,
      await makeCourseSeriesFile('/editor/curator/EntryProjectPlus/lesson?tab=code'),
      'alice',
      writes
    )

    expect(addCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        content: { entrypoint: '/editor/curator/EntryProjectPlus/lesson?tab=code', prompt: 'Imported prompt' }
      }),
      undefined
    )
  })
})

describe('importCourseSeriesFile when it fails', () => {
  it('undoes what it wrote before the series held the imported courses', async () => {
    vi.mocked(updateCourseSeries).mockRejectedValueOnce(new Error('network'))

    await expect(
      importCourseSeriesFile(
        existingSeries,
        await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
        'alice',
        writes
      )
    ).rejects.toThrow('network')

    // The series still holds the old course, so the imported course and the project it created are gone.
    expect(vi.mocked(deleteCourse).mock.calls).toEqual([['imported-course']])
    expect(deleteProject).toHaveBeenCalledWith('alice', 'EntryProject')
  })

  it('puts back both what an overwritten project holds and what it published', async () => {
    const backup = projectData({ latestRelease: releaseA })
    vi.mocked(getProject)
      .mockResolvedValueOnce(backup)
      .mockResolvedValueOnce({ ...backup, revision: 8, latestRelease: { ...releaseA, id: 'release-imported' } })
    vi.mocked(updateCourseSeries).mockRejectedValueOnce(new Error('network'))

    await expect(
      importCourseSeriesFile(
        existingSeries,
        await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
        'alice',
        writes
      )
    ).rejects.toThrow('network')

    // The published content goes back and is released, then the rest of the project over it.
    expect(vi.mocked(updateProject).mock.calls.slice(-2)).toEqual([
      ['alice', 'EntryProject', { files: releaseA.files, thumbnail: releaseA.thumbnail }],
      [
        'alice',
        'EntryProject',
        {
          files: backup.files,
          visibility: Visibility.Private,
          displayName: 'Entry',
          description: 'Old description',
          instructions: 'Old instructions',
          extraSettings: {},
          thumbnail: 'kodo://draft/thumbnail.png'
        }
      ]
    ])
    expect(createProjectRelease).toHaveBeenLastCalledWith('alice', 'EntryProject', {
      name: expect.stringMatching(/^v0\.0\.0\+/),
      description: 'Restored after a failed import of course series "Imported series"',
      projectRevision: 8
    })
    const [publishedWrite, restWrite] = vi.mocked(updateProject).mock.invocationCallOrder.slice(-2)
    const release = vi.mocked(createProjectRelease).mock.invocationCallOrder.at(-1)!
    expect(publishedWrite).toBeLessThan(release)
    expect(release).toBeLessThan(restWrite)
    expect(deleteProject).not.toHaveBeenCalled()
  })

  it('does not publish again a project the import did not get to publish', async () => {
    const backup = projectData({ latestRelease: releaseA })
    vi.mocked(getProject)
      .mockResolvedValueOnce(backup)
      .mockResolvedValueOnce({ ...backup, revision: 8 })
    vi.mocked(createProjectRelease).mockRejectedValueOnce(new Error('network'))

    await expect(
      importCourseSeriesFile(
        existingSeries,
        await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
        'alice',
        writes
      )
    ).rejects.toThrow('network')

    expect(createProjectRelease).toHaveBeenCalledTimes(1)
    expect(updateProject).toHaveBeenLastCalledWith(
      'alice',
      'EntryProject',
      expect.objectContaining({ files: backup.files, visibility: Visibility.Private })
    )
    expect(addCourse).not.toHaveBeenCalled()
  })

  it('leaves alone a project the import did not get to write', async () => {
    const backup = projectData({ latestRelease: releaseA })
    vi.mocked(getProject).mockResolvedValueOnce(backup).mockResolvedValueOnce(backup)
    vi.mocked(cloudHelpers.save).mockRejectedValueOnce(new Error('network'))

    await expect(
      importCourseSeriesFile(
        existingSeries,
        await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
        'alice',
        writes
      )
    ).rejects.toThrow('network')

    expect(updateProject).not.toHaveBeenCalled()
    expect(createProjectRelease).not.toHaveBeenCalled()
  })

  it('says when it cannot take back the release it made of a project that had none', async () => {
    const backup = projectData({ visibility: Visibility.Public })
    vi.mocked(getProject)
      .mockResolvedValueOnce(backup)
      .mockResolvedValueOnce({ ...backup, revision: 8, latestRelease: { ...releaseA, id: 'release-imported' } })
    vi.mocked(updateCourseSeries).mockRejectedValueOnce(new Error('network'))

    await expect(
      importCourseSeriesFile(
        existingSeries,
        await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
        'alice',
        writes
      )
    ).rejects.toThrow('some changes could not be undone: the release the import made of project alice/EntryProject')
    expect(createProjectRelease).toHaveBeenCalledTimes(1)
    expect(updateProject).toHaveBeenLastCalledWith(
      'alice',
      'EntryProject',
      expect.objectContaining({ files: backup.files, visibility: Visibility.Public })
    )
  })

  it('does not count a project it failed to create as one left behind', async () => {
    vi.mocked(cloudHelpers.save).mockRejectedValueOnce(new Error('network'))
    vi.mocked(deleteProject).mockRejectedValueOnce(
      new ApiException(ApiExceptionCode.errorNotFound, 'Not found', {
        req: new Request('https://api.example.com/projects/alice/EntryProject')
      })
    )

    await expect(
      importCourseSeriesFile(
        existingSeries,
        await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
        'alice',
        writes
      )
    ).rejects.toThrow('network')
    expect(deleteProject).toHaveBeenCalledWith('alice', 'EntryProject')
  })

  it('takes a lost answer for success when the series holds the imported courses', async () => {
    vi.mocked(updateCourseSeries).mockRejectedValueOnce(new Error('timeout'))
    vi.mocked(getCourseSeries).mockResolvedValueOnce({ ...existingSeries, courseIDs: ['imported-course'] })

    const result = await importCourseSeriesFile(
      existingSeries,
      await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
      'alice',
      writes
    )

    expect(result.courseSeries.courseIDs).toEqual(['imported-course'])
    expect(vi.mocked(deleteCourse).mock.calls).toEqual([['course-1']])
    expect(deleteProject).not.toHaveBeenCalled()
  })

  it('finds the series a lost answer created', async () => {
    vi.mocked(addCourseSeries).mockRejectedValueOnce(new Error('timeout'))
    vi.mocked(listSignedInUserCourseSeries).mockResolvedValueOnce({
      total: 2,
      data: [
        { ...existingSeries, id: 'other-series', courseIDs: ['course-9'] },
        { ...existingSeries, id: 'created-series', courseIDs: ['imported-course'] }
      ]
    })

    const result = await importCourseSeriesFileAsNew(
      await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
      'guided',
      'alice'
    )

    expect(result.courseSeries.id).toBe('created-series')
    expect(listSignedInUserCourseSeries).toHaveBeenCalledWith({
      kind: 'guided',
      orderBy: 'createdAt',
      sortOrder: 'desc',
      pageIndex: 1,
      pageSize: 10
    })
    expect(deleteCourse).not.toHaveBeenCalled()
  })

  it('undoes nothing when it cannot tell whether the series took the imported courses', async () => {
    vi.mocked(updateCourseSeries).mockRejectedValueOnce(new Error('timeout'))
    vi.mocked(getCourseSeries).mockRejectedValueOnce(new Error('offline'))

    await expect(
      importCourseSeriesFile(
        existingSeries,
        await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
        'alice',
        writes
      )
    ).rejects.toThrow('Could not tell whether the course series file was imported')
    expect(deleteCourse).not.toHaveBeenCalled()
    expect(deleteProject).not.toHaveBeenCalled()
  })

  it('says what it could not undo', async () => {
    vi.mocked(updateCourseSeries).mockRejectedValueOnce(new Error('network'))
    vi.mocked(deleteCourse).mockRejectedValueOnce(new Error('network'))

    const failure = importCourseSeriesFile(
      existingSeries,
      await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
      'alice',
      writes
    )

    await expect(failure).rejects.toBeInstanceOf(DefaultException)
    await expect(failure).rejects.toThrow('some changes could not be undone: course imported-course')
  })

  it('leaves the old courses it could not delete once the series holds the imported ones', async () => {
    vi.mocked(deleteCourse).mockRejectedValueOnce(new Error('network'))

    const result = await importCourseSeriesFile(
      existingSeries,
      await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
      'alice',
      writes
    )

    expect(result.undeletedCourseIDs).toEqual(['course-1'])
    expect(result.courseSeries.courseIDs).toEqual(['imported-course'])
    expect(deleteProject).not.toHaveBeenCalled()
  })

  it('refuses a file with a project it cannot read, before writing anything', async () => {
    vi.mocked(xbpHelpers.load).mockRejectedValueOnce(new Error('not a zip'))

    await expect(
      importCourseSeriesFile(
        existingSeries,
        await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
        'alice',
        writes
      )
    ).rejects.toThrow('Invalid course series file: project "EntryProject" cannot be read')
    expect(getProject).not.toHaveBeenCalled()
    expect(cloudHelpers.save).not.toHaveBeenCalled()
    expect(addCourse).not.toHaveBeenCalled()
  })

  it('refuses a file missing a thumbnail, before writing anything', async () => {
    await expect(
      importCourseSeriesFile(
        existingSeries,
        await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code', ['thumbnails/courses/0.png']),
        'alice',
        writes
      )
    ).rejects.toThrow('Invalid course series file: missing thumbnails/courses/0.png')
    expect(cloudHelpers.save).not.toHaveBeenCalled()
    expect(addCourse).not.toHaveBeenCalled()
  })

  it('refuses a file of the other kind', async () => {
    const file = await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code')

    await expect(importCourseSeriesFileAsNew(file, 'playground', 'alice')).rejects.toThrow(
      'holds a Guided course series, which cannot be imported as a Playground one'
    )
    expect(addCourse).not.toHaveBeenCalled()
  })
})

describe('Playground course series files', () => {
  const playgroundSeries: CourseSeries = { ...existingSeries, id: 'playground-series', kind: 'playground' }

  const playgroundCourse: PlaygroundCourse = {
    id: 'course-1',
    owner: 'curator',
    kind: 'playground',
    title: 'Measure it',
    thumbnail: 'kodo://bucket/course-thumbnail.png',
    content: {
      'index.json': 'kodo://bucket/index.json',
      'main_course.gox': 'kodo://bucket/main_course.gox',
      'assets/videos/step/step.mp4': 'kodo://bucket/step.mp4'
    }
  }

  it('exports each course with its files, at their paths in the course', async () => {
    vi.mocked(getCourse).mockResolvedValue(playgroundCourse)

    const file = await exportCourseSeriesFile(playgroundSeries)
    const unzipped = await unzip(new Uint8Array(await file.arrayBuffer()))
    const manifest = JSON.parse(new TextDecoder().decode(unzipped['course-series.json']!)) as Record<string, any>

    expect(manifest.version).toBe(4)
    expect(manifest.courseSeries.kind).toBe('playground')
    expect(manifest.courses).toEqual([
      { title: 'Measure it', thumbnail: { path: 'thumbnails/courses/0.png' }, files: 'courses/0' }
    ])
    expect(manifest.projects).toEqual([])
    expect(new TextDecoder().decode(unzipped['courses/0/main_course.gox'])).toBe(
      'content:kodo://bucket/main_course.gox'
    )
    expect(Object.keys(unzipped)).toEqual(
      expect.arrayContaining(['courses/0/index.json', 'courses/0/assets/videos/step/step.mp4'])
    )
  })

  it('imports the courses with their files as they are in the file', async () => {
    const ctrl = new AbortController()

    const result = await importCourseSeriesFileAsNew(
      await makePlaygroundSeriesFile([playgroundCourseFiles('onStart => {\n\tshowVideo "step"\n}')]),
      'playground',
      'alice',
      ctrl.signal
    )

    const [uploaded] = vi.mocked(saveFiles).mock.calls[0]
    expect(Object.keys(uploaded).sort()).toEqual(Object.keys(playgroundCourseFiles('')).sort())
    expect(await toText(uploaded['main_course.gox']!)).toBe('onStart => {\n\tshowVideo "step"\n}')
    expect(addCourse).toHaveBeenCalledWith(
      {
        kind: 'playground',
        title: 'Course 0',
        thumbnail: 'kodo://imported/thumbnails/courses/0.png',
        content: expect.objectContaining({ 'main_course.gox': 'kodo://imported/main_course.gox' })
      },
      ctrl.signal
    )
    expect(addCourseSeries).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'playground', courseIDs: ['imported-course'] }),
      ctrl.signal
    )
    expect(result.undeletedCourseIDs).toEqual([])
    expect(getProject).not.toHaveBeenCalled()
  })

  it('refuses a file with a course it cannot import, before writing anything', async () => {
    const missingProgram = playgroundCourseFiles('')
    delete missingProgram['main_course.gox']
    const file = await makePlaygroundSeriesFile([
      playgroundCourseFiles('onStart => {\n\tshowVideo "intro"\n}'),
      missingProgram
    ])

    await expect(inspectCourseSeriesFileImport(playgroundSeries, 'playground', file, 'alice')).rejects.toThrow(
      'The course series file cannot be imported: "Course 0": The course program plays video "intro", which the course does not have; "Course 1": The course program (main_course.gox) is missing'
    )
    await expect(importCourseSeriesFile(playgroundSeries, file, 'alice', writes)).rejects.toBeInstanceOf(
      DefaultException
    )
    expect(saveFiles).not.toHaveBeenCalled()
    expect(addCourse).not.toHaveBeenCalled()
    expect(updateCourseSeries).not.toHaveBeenCalled()
  })

  it('counts the problems it does not list the same way in both languages', async () => {
    const file = await makePlaygroundSeriesFile(
      ['a', 'b', 'c', 'd'].map((name) => playgroundCourseFiles(`onStart => {\n\tshowVideo "${name}"\n}`))
    )

    const error = await importCourseSeriesFile(playgroundSeries, file, 'alice', writes).catch((e) => e)

    expect(error).toBeInstanceOf(DefaultException)
    expect((error as DefaultException).userMessage.en).toMatch(/; and 1 more$/)
    expect((error as DefaultException).userMessage.zh).toMatch(/；另有 1 处问题$/)
  })

  it('does not take a lost answer for success when the file has no courses', async () => {
    const emptySeries = { ...playgroundSeries, courseIDs: [] }
    vi.mocked(updateCourseSeries).mockRejectedValueOnce(new Error('timeout'))
    vi.mocked(getCourseSeries).mockResolvedValueOnce(emptySeries)

    await expect(
      importCourseSeriesFile(emptySeries, await makePlaygroundSeriesFile([]), 'alice', writes)
    ).rejects.toThrow('timeout')
    // An empty series looks the same whether the commit took effect or not, so it is not read back.
    expect(getCourseSeries).not.toHaveBeenCalled()
  })

  it('refuses a file that comes with separate projects, before writing anything', async () => {
    const file = await makePlaygroundSeriesFile(
      [playgroundCourseFiles('onStart => {}')],
      [{ fullName: 'curator/EntryProject', name: 'EntryProject', path: 'projects/0.xbp' }]
    )

    await expect(importCourseSeriesFile(playgroundSeries, file, 'alice', writes)).rejects.toThrow(
      'Playground courses cannot come with separate projects'
    )
    expect(getProject).not.toHaveBeenCalled()
    expect(cloudHelpers.save).not.toHaveBeenCalled()
    expect(addCourse).not.toHaveBeenCalled()
  })

  it('reports no projects to overwrite', async () => {
    const inspection = await inspectCourseSeriesFileImport(
      playgroundSeries,
      'playground',
      await makePlaygroundSeriesFile([playgroundCourseFiles('onStart => {}')]),
      'alice'
    )

    expect(inspection).toEqual({ deletedCourses: ['Course 1'], overwrittenProjects: [] })
  })
})

/** The files of a Playground Course whose program is `program` and which has a video named "step". */
function playgroundCourseFiles(program: string): Record<string, string> {
  return {
    'index.json': JSON.stringify({ project: { type: 'spx', root: 'project' }, inEditorPath: '', copilotContext: '' }),
    'main_course.gox': program,
    'project/assets/index.json': '{}',
    'assets/videos/step/index.json': JSON.stringify({ path: 'step.mp4', builder_id: 'step-id' }),
    'assets/videos/step/step.mp4': 'video'
  }
}

async function makePlaygroundSeriesFile(
  courses: Array<Record<string, string>>,
  projects: Array<{ fullName: string; name: string; path: string }> = []
) {
  const encoder = new TextEncoder()
  const zippable: Zippable = {
    'course-series.json': encoder.encode(
      JSON.stringify({
        format: 'xbuilder-course-series',
        version: 4,
        courseSeries: {
          kind: 'playground',
          title: 'Imported series',
          description: 'Imported description',
          thumbnail: { path: 'thumbnails/course-series.png' }
        },
        courses: courses.map((_, index) => ({
          title: `Course ${index}`,
          thumbnail: { path: `thumbnails/courses/${index}.png` },
          files: `courses/${index}`
        })),
        projects
      })
    ),
    'thumbnails/course-series.png': encoder.encode('series thumbnail')
  }
  for (const project of projects) zippable[project.path] = encoder.encode('project')
  courses.forEach((files, index) => {
    zippable[`thumbnails/courses/${index}.png`] = encoder.encode('course thumbnail')
    for (const [path, content] of Object.entries(files)) zippable[`courses/${index}/${path}`] = encoder.encode(content)
  })
  return new File([await zip(zippable)], 'Imported series.xbcs.zip', { type: 'application/zip' })
}

describe('inspectCourseSeriesFileImport', () => {
  it('reports deleted courses and overwritten projects', async () => {
    vi.mocked(getProject).mockImplementation(async (_owner, name) => {
      if (name !== 'EntryProject') {
        throw new ApiException(ApiExceptionCode.errorNotFound, 'Not found', {
          req: new Request(`https://api.example.com/projects/alice/${name}`)
        })
      }
      return { owner: 'alice', name } as Awaited<ReturnType<typeof getProject>>
    })

    const inspection = await inspectCourseSeriesFileImport(
      existingSeries,
      'guided',
      await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
      'alice'
    )

    expect(inspection).toEqual({
      deletedCourses: ['Course 1'],
      overwrittenProjects: ['EntryProject']
    })
  })
})

async function makeCourseSeriesFile(
  entrypoint: string,
  /** Paths of entries to leave out. */
  omit: string[] = []
) {
  const zippable: Zippable = {
    'course-series.json': new TextEncoder().encode(
      JSON.stringify({
        format: 'xbuilder-course-series',
        version: 4,
        courseSeries: {
          kind: 'guided',
          title: 'Imported series',
          description: 'Imported description',
          thumbnail: { path: 'thumbnails/course-series.png' }
        },
        courses: [
          {
            title: 'Imported course',
            thumbnail: { path: 'thumbnails/courses/0.png' },
            content: { entrypoint, prompt: 'Imported prompt' }
          }
        ],
        projects: [{ fullName: 'curator/EntryProject', name: 'EntryProject', path: 'projects/0.xbp' }]
      })
    ),
    'thumbnails/course-series.png': new TextEncoder().encode('series thumbnail'),
    'thumbnails/courses/0.png': new TextEncoder().encode('course thumbnail'),
    'projects/0.xbp': new TextEncoder().encode('entry project')
  }
  for (const path of omit) delete zippable[path]
  return new File([await zip(zippable)], 'Imported series.xbcs.zip', { type: 'application/zip' })
}
