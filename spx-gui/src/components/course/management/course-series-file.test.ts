import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { zip, unzip, type Zippable } from '@/utils/zip'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { addCourse, deleteCourse, getCourse, type Course } from '@/apis/course'
import { addCourseSeries, updateCourseSeries, type CourseSeries } from '@/apis/course-series'
import { getProject, ProjectType, updateProject, Visibility } from '@/apis/project'
import { createProjectRelease } from '@/apis/project-release'
import { cloudHelpers, createFileWithUniversalUrl, saveFile } from '@/models/common/cloud'
import { File as LazyFile } from '@/models/common/file'
import { xbpHelpers } from '@/models/common/xbp'
import { exportCourseSeriesFile, importCourseSeriesFile, inspectCourseSeriesFileImport } from './course-series-file'

dayjs.extend(utc)
dayjs.extend(timezone)

vi.mock('@/apis/course', () => ({
  getCourse: vi.fn(),
  addCourse: vi.fn(),
  deleteCourse: vi.fn()
}))

vi.mock('@/apis/course-series', () => ({
  addCourseSeries: vi.fn(),
  updateCourseSeries: vi.fn()
}))

vi.mock('@/apis/project', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/project')>()),
  getProject: vi.fn(),
  updateProject: vi.fn()
}))

vi.mock('@/apis/project-release', () => ({
  createProjectRelease: vi.fn()
}))

vi.mock('@/models/common/cloud', () => ({
  cloudHelpers: {
    load: vi.fn(),
    save: vi.fn()
  },
  createFileWithUniversalUrl: vi.fn(),
  saveFile: vi.fn()
}))

vi.mock('@/models/common/xbp', () => ({
  xbpHelpers: {
    save: vi.fn(),
    load: vi.fn()
  }
}))

const existingSeries: CourseSeries = {
  id: 'series-id',
  owner: 'alice',
  title: '编程 课程',
  thumbnail: 'kodo://bucket/series-thumbnail.png',
  description: 'Course series description',
  order: 42,
  courseIDs: ['course-1'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
}

const existingCourse: Course = {
  id: 'course-1',
  owner: 'curator',
  title: 'Course 1',
  thumbnail: 'kodo://bucket/course-thumbnail.png',
  entrypoint: '/editor/curator/EntryProject/lesson?tab=code',
  references: [{ type: 'project', fullName: 'curator/RefProject' }],
  prompt: 'Prompt'
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
        version: 1,
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
    async (serialized) => serialized as Awaited<ReturnType<typeof cloudHelpers.save>>
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
    id,
    owner: 'alice',
    ...params,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }))
  vi.mocked(addCourseSeries).mockImplementation(async (params) => ({
    id: 'created-series',
    owner: 'alice',
    ...params,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  }))
  vi.mocked(deleteCourse).mockResolvedValue(undefined)
  vi.mocked(updateProject).mockResolvedValue({} as Awaited<ReturnType<typeof updateProject>>)
  vi.mocked(createProjectRelease).mockResolvedValue({} as Awaited<ReturnType<typeof createProjectRelease>>)
})

describe('exportCourseSeriesFile', () => {
  it('exports a self-contained package with related projects', async () => {
    const file = await exportCourseSeriesFile(existingSeries)
    const unzipped = await unzip(new Uint8Array(await file.arrayBuffer()))
    const manifest = JSON.parse(new TextDecoder().decode(unzipped['course-series.json']!)) as Record<string, any>

    expect(file.name).toBe('编程 课程.xbcs.zip')
    expect(manifest.courseSeries).toMatchObject({
      title: existingSeries.title,
      description: existingSeries.description,
      thumbnail: { path: 'thumbnails/course-series.png' }
    })
    expect(manifest.courseSeries).not.toHaveProperty('order')
    expect(manifest.courses[0].thumbnail).toEqual({ path: 'thumbnails/courses/0.png' })
    expect(manifest.projects.map((project: { fullName: string }) => project.fullName)).toEqual([
      'curator/RefProject',
      'curator/EntryProject'
    ])
    expect(Object.keys(unzipped)).toEqual(
      expect.arrayContaining([
        'course-series.json',
        'thumbnails/course-series.png',
        'thumbnails/courses/0.png',
        'projects/0.xbp',
        'projects/1.xbp'
      ])
    )
  })
})

describe('importCourseSeriesFile', () => {
  it('rewrites exact editor project segment and preserves local order', async () => {
    await importCourseSeriesFile(
      existingSeries,
      await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
      'alice'
    )

    expect(addCourse).toHaveBeenCalledWith(
      {
        title: 'Imported course',
        thumbnail: 'kodo://imported/thumbnails/courses/0.png',
        entrypoint: '/editor/alice/EntryProject/lesson?tab=code',
        references: [{ type: 'project', fullName: 'alice/RefProject' }],
        prompt: 'Imported prompt'
      },
      undefined
    )
    expect(updateCourseSeries).toHaveBeenCalledWith(
      existingSeries.id,
      expect.objectContaining({
        order: existingSeries.order,
        courseIDs: ['imported-course']
      }),
      undefined
    )
  })

  it('does not rewrite longer project names that only share a prefix', async () => {
    await importCourseSeriesFile(
      existingSeries,
      await makeCourseSeriesFile('/editor/curator/EntryProjectPlus/lesson?tab=code'),
      'alice'
    )

    expect(addCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        entrypoint: '/editor/curator/EntryProjectPlus/lesson?tab=code'
      }),
      undefined
    )
  })
})

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
      await makeCourseSeriesFile('/editor/curator/EntryProject/lesson?tab=code'),
      'alice'
    )

    expect(inspection).toEqual({
      deletedCourses: ['Course 1'],
      overwrittenProjects: ['EntryProject']
    })
  })
})

async function makeCourseSeriesFile(entrypoint: string) {
  const zippable: Zippable = {
    'course-series.json': new TextEncoder().encode(
      JSON.stringify({
        format: 'xbuilder-course-series',
        version: 1,
        courseSeries: {
          title: 'Imported series',
          description: 'Imported description',
          thumbnail: { path: 'thumbnails/course-series.png' }
        },
        courses: [
          {
            title: 'Imported course',
            thumbnail: { path: 'thumbnails/courses/0.png' },
            entrypoint,
            references: [{ type: 'project', fullName: 'curator/RefProject' }],
            prompt: 'Imported prompt'
          }
        ],
        projects: [
          { fullName: 'curator/EntryProject', name: 'EntryProject', path: 'projects/0.xbp' },
          { fullName: 'curator/RefProject', name: 'RefProject', path: 'projects/1.xbp' }
        ]
      })
    ),
    'thumbnails/course-series.png': new TextEncoder().encode('series thumbnail'),
    'thumbnails/courses/0.png': new TextEncoder().encode('course thumbnail'),
    'projects/0.xbp': new TextEncoder().encode('entry project'),
    'projects/1.xbp': new TextEncoder().encode('ref project')
  }
  return new File([await zip(zippable)], 'Imported series.xbcs.zip', { type: 'application/zip' })
}
