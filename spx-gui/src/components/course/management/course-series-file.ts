import dayjs from 'dayjs'
import { zip, unzip, type Zippable } from '@/utils/zip'
import { extname } from '@/utils/path'
import { DefaultException } from '@/utils/exception'
import { getExtFromMime } from '@/utils/file'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { getCourse, addCourse, deleteCourse, type Course, type Reference } from '@/apis/course'
import { addCourseSeries, updateCourseSeries, type CourseSeries } from '@/apis/course-series'
import { getProject, ProjectType, updateProject, Visibility, type UpdateProjectParams } from '@/apis/project'
import { createProjectRelease } from '@/apis/project-release'
import { cloudHelpers, createFileWithUniversalUrl, saveFile } from '@/models/common/cloud'
import { File as LazyFile } from '@/models/common/file'
import { xbpHelpers } from '@/models/common/xbp'

const manifestFileName = 'course-series.json'
const format = 'xbuilder-course-series'
const version = 1

type CourseSeriesFileThumbnail = {
  path: string
}

type CourseSeriesFileCourse = Pick<Course, 'title' | 'entrypoint' | 'references' | 'prompt'> & {
  thumbnail: CourseSeriesFileThumbnail
}

type CourseSeriesFileProject = {
  fullName: string
  name: string
  path: string
}

type CourseSeriesFileManifest = {
  format: typeof format
  version: typeof version
  courseSeries: Pick<CourseSeries, 'title' | 'description'> & {
    thumbnail: CourseSeriesFileThumbnail
  }
  courses: CourseSeriesFileCourse[]
  projects: CourseSeriesFileProject[]
}

type ParsedProjectFullName = {
  owner: string
  name: string
}

export type CourseSeriesFileImportInspection = {
  deletedCourses: string[]
  overwrittenProjects: string[]
}

export async function exportCourseSeriesFile(courseSeries: CourseSeries, signal?: AbortSignal) {
  const courses = await Promise.all(courseSeries.courseIDs.map((id) => getCourse(id, signal)))
  const projects = collectRelatedProjects(courses)
  const zippable: Zippable = {}

  const courseSeriesThumbnail = await exportThumbnail(
    courseSeries.thumbnail,
    'thumbnails/course-series',
    zippable,
    signal
  )
  const exportedCourses = await Promise.all(
    courses.map(
      async (course, index): Promise<CourseSeriesFileCourse> => ({
        title: course.title,
        entrypoint: course.entrypoint,
        references: course.references,
        prompt: course.prompt,
        thumbnail: await exportThumbnail(course.thumbnail, `thumbnails/courses/${index}`, zippable, signal)
      })
    )
  )

  const exportedProjects = await Promise.all(
    projects.map(async (project, index): Promise<CourseSeriesFileProject> => {
      const serialized = await cloudHelpers.load(project.owner, project.name, true, signal)
      const file = await xbpHelpers.save(serialized, signal)
      const path = `projects/${index}.xbp`
      zippable[path] = new Uint8Array(await file.arrayBuffer())
      return { fullName: project.fullName, name: project.name, path }
    })
  )

  const manifest: CourseSeriesFileManifest = {
    format,
    version,
    courseSeries: {
      title: courseSeries.title,
      description: courseSeries.description,
      thumbnail: courseSeriesThumbnail
    },
    courses: exportedCourses,
    projects: exportedProjects
  }
  zippable[manifestFileName] = new TextEncoder().encode(JSON.stringify(manifest))

  const zipped = await zip(zippable, { level: 6, signal })
  return new File([zipped], `${courseSeries.title}.xbcs.zip`, { type: 'application/zip' })
}

export async function importCourseSeriesFile(
  courseSeries: CourseSeries,
  file: globalThis.File,
  signedInUsername: string,
  signal?: AbortSignal
) {
  const data = await loadCourseSeriesFile(file, signal)
  return importCourseSeriesFileData(courseSeries, data, signedInUsername, signal)
}

export async function importCourseSeriesFileAsNew(
  file: globalThis.File,
  signedInUsername: string,
  signal?: AbortSignal
) {
  const data = await loadCourseSeriesFile(file, signal)
  const courseSeries = await addCourseSeries(
    {
      title: data.manifest.courseSeries.title,
      thumbnail: '',
      description: data.manifest.courseSeries.description,
      order: 1,
      courseIDs: []
    },
    signal
  )
  return importCourseSeriesFileData(courseSeries, data, signedInUsername, signal)
}

export async function inspectCourseSeriesFileImport(
  courseSeries: CourseSeries | null,
  file: globalThis.File,
  signedInUsername: string,
  signal?: AbortSignal
): Promise<CourseSeriesFileImportInspection> {
  const data = await loadCourseSeriesFile(file, signal)
  const deletedCourses =
    courseSeries == null
      ? []
      : await Promise.all(courseSeries.courseIDs.map(async (id) => (await getCourse(id, signal)).title))
  const overwrittenProjects = await Promise.all(
    data.manifest.projects.map(async (project) => {
      const existingProject = await getSignedInUserProject(signedInUsername, project.name, signal)
      return existingProject?.name ?? null
    })
  )
  return { deletedCourses, overwrittenProjects: overwrittenProjects.filter((p) => p != null) }
}

async function loadCourseSeriesFile(file: globalThis.File, signal?: AbortSignal) {
  const arrayBuffer = await file.arrayBuffer()
  const unzipped = await unzip(new Uint8Array(arrayBuffer), { signal })
  const manifest = JSON.parse(
    new TextDecoder().decode(getRequiredEntry(unzipped, manifestFileName))
  ) as CourseSeriesFileManifest
  if (manifest.format !== format || manifest.version !== version) {
    throw new DefaultException({
      en: 'Unsupported course series file format',
      zh: '不支持的课程系列文件格式'
    })
  }
  return { manifest, unzipped }
}

async function importCourseSeriesFileData(
  courseSeries: CourseSeries,
  { manifest, unzipped }: Awaited<ReturnType<typeof loadCourseSeriesFile>>,
  signedInUsername: string,
  signal?: AbortSignal
) {
  const projectFullNameMap = new Map<string, string>()
  for (const project of manifest.projects) {
    const importedFullName = await importProject(project, manifest, unzipped, signedInUsername, signal)
    projectFullNameMap.set(project.fullName, importedFullName)
  }

  const importedCourses = []
  for (const course of manifest.courses) {
    importedCourses.push(
      await addCourse(
        {
          title: course.title,
          thumbnail: await importThumbnail(course.thumbnail, unzipped, signal),
          entrypoint: rewriteProjectFullNames(course.entrypoint, projectFullNameMap),
          references: rewriteReferences(course.references, projectFullNameMap),
          prompt: course.prompt
        },
        signal
      )
    )
  }

  const importedCourseSeries = await updateCourseSeries(
    courseSeries.id,
    {
      title: manifest.courseSeries.title,
      thumbnail: await importThumbnail(manifest.courseSeries.thumbnail, unzipped, signal),
      description: manifest.courseSeries.description,
      // Keep the local sort order because it depends on other course series in the current environment.
      order: courseSeries.order,
      courseIDs: importedCourses.map((course) => course.id)
    },
    signal
  )

  await Promise.all(courseSeries.courseIDs.map((courseID) => deleteCourse(courseID)))
  return importedCourseSeries
}

async function exportThumbnail(
  universalUrl: string,
  pathWithoutExt: string,
  zippable: Zippable,
  signal?: AbortSignal
): Promise<CourseSeriesFileThumbnail> {
  if (universalUrl === '') {
    throw new DefaultException({
      en: 'Course series file export requires all thumbnails to be uploaded',
      zh: '导出课程系列文件要求所有缩略图都已上传'
    })
  }

  const file = createFileWithUniversalUrl(universalUrl)
  const ext = extname(file.name) || `.${getExtFromMime(file.type) ?? 'jpg'}`
  const path = `${pathWithoutExt}${ext}`
  zippable[path] = new Uint8Array(await file.arrayBuffer(signal))
  return { path }
}

async function importThumbnail(
  thumbnail: CourseSeriesFileThumbnail,
  unzipped: Record<string, Uint8Array<ArrayBuffer>>,
  signal?: AbortSignal
) {
  const data = getRequiredEntry(unzipped, thumbnail.path)
  return saveFile(createLazyFile(thumbnail.path, data), signal)
}

function collectRelatedProjects(courses: Course[]) {
  const projects = new Map<string, ParsedProjectFullName & { fullName: string }>()
  for (const course of courses) {
    for (const reference of course.references) {
      if (reference.type !== 'project') continue
      const parsed = parseProjectFullName(reference.fullName)
      projects.set(reference.fullName, { ...parsed, fullName: reference.fullName })
    }
    const entrypointProject = parseEditorProjectFullName(course.entrypoint)
    if (entrypointProject != null) projects.set(entrypointProject.fullName, entrypointProject)
  }
  return [...projects.values()]
}

function parseEditorProjectFullName(entrypoint: string) {
  const parsed = parseEditorEntrypoint(entrypoint)
  if (parsed == null) return null
  const fullName = `${parsed.owner}/${parsed.name}`
  return { ...parseProjectFullName(fullName), fullName }
}

function parseProjectFullName(fullName: string): ParsedProjectFullName {
  const parts = fullName.split('/')
  if (parts.length !== 2 || parts[0] === '' || parts[1] === '') {
    throw new DefaultException({
      en: `Invalid project reference: ${fullName}`,
      zh: `无效的项目引用：${fullName}`
    })
  }
  return { owner: decodeURIComponent(parts[0]), name: decodeURIComponent(parts[1]) }
}

async function importProject(
  project: CourseSeriesFileProject,
  manifest: CourseSeriesFileManifest,
  unzipped: Record<string, Uint8Array<ArrayBuffer>>,
  signedInUsername: string,
  signal?: AbortSignal
) {
  const serialized = await xbpHelpers.load(new File([getRequiredEntry(unzipped, project.path)], `${project.name}.xbp`))
  const existingProject = await getSignedInUserProject(signedInUsername, project.name, signal)
  const owner = existingProject?.owner ?? signedInUsername
  const name = existingProject?.name ?? project.name
  const sourceMetadata = { ...serialized.metadata }
  delete sourceMetadata.id
  const metadata = {
    ...sourceMetadata,
    owner,
    name,
    displayName: serialized.metadata.displayName ?? project.name,
    type: serialized.metadata.type ?? ProjectType.Game,
    visibility: Visibility.Public
  }
  if (existingProject != null) metadata.id = existingProject.id

  await cloudHelpers.save({ metadata, files: serialized.files }, signal)
  const metadataUpdates: UpdateProjectParams = {}
  if (serialized.metadata.description != null) metadataUpdates.description = serialized.metadata.description
  if (serialized.metadata.instructions != null) metadataUpdates.instructions = serialized.metadata.instructions
  if (serialized.metadata.extraSettings != null) metadataUpdates.extraSettings = serialized.metadata.extraSettings
  if (Object.keys(metadataUpdates).length > 0) await updateProject(owner, name, metadataUpdates, signal)
  await createProjectRelease(owner, name, {
    name: generateReleaseName(),
    description: `Imported from course series "${manifest.courseSeries.title}"`,
    thumbnail: ''
  })
  return `${owner}/${name}`
}

async function getSignedInUserProject(owner: string, name: string, signal?: AbortSignal) {
  try {
    return await getProject(owner, name, signal)
  } catch (e) {
    if (e instanceof ApiException && e.code === ApiExceptionCode.errorNotFound) return null
    throw e
  }
}

function rewriteReferences(references: Reference[], projectFullNameMap: Map<string, string>): Reference[] {
  return references.map((reference) => {
    if (reference.type !== 'project') return reference
    return { ...reference, fullName: projectFullNameMap.get(reference.fullName) ?? reference.fullName }
  })
}

function rewriteProjectFullNames(value: string, projectFullNameMap: Map<string, string>) {
  const parsed = parseEditorEntrypoint(value)
  if (parsed == null) return value

  const source = `${parsed.owner}/${parsed.name}`
  const target = projectFullNameMap.get(source)
  if (target == null) return value

  const { owner, name } = parseProjectFullName(target)
  parsed.url.pathname = `/editor/${encodeURIComponent(owner)}/${encodeURIComponent(name)}${parsed.restPath}`
  return parsed.isAbsolute ? parsed.url.toString() : `${parsed.url.pathname}${parsed.url.search}${parsed.url.hash}`
}

function parseEditorEntrypoint(value: string) {
  const base = 'https://xbuilder.invalid'

  let url: URL
  let isAbsolute = false
  try {
    url = new URL(value)
    isAbsolute = true
  } catch {
    try {
      url = new URL(value, base)
    } catch {
      return null
    }
  }

  const segments = url.pathname.split('/').filter((segment) => segment !== '')
  if (segments[0] !== 'editor' || segments[1] == null || segments[2] == null) return null

  const owner = decodeURIComponent(segments[1])
  const name = decodeURIComponent(segments[2])
  const restPath = segments.length > 3 ? `/${segments.slice(3).join('/')}` : ''

  return { url, isAbsolute, owner, name, restPath }
}

function getRequiredEntry(unzipped: Record<string, Uint8Array<ArrayBuffer>>, path: string) {
  const entry = unzipped[path]
  if (entry == null) {
    throw new DefaultException({
      en: `Invalid course series file: missing ${path}`,
      zh: `无效的课程系列文件：缺少 ${path}`
    })
  }
  return entry
}

function createLazyFile(path: string, data: Uint8Array<ArrayBuffer>) {
  return new LazyFile(path, () =>
    Promise.resolve(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
  )
}

function generateReleaseName() {
  const timeStr = dayjs().tz('UTC').format('YYYYMMDDHHmmss')
  const build = `${timeStr}.${Math.random().toString(16).slice(2, 8)}`
  return `v0.0.0+${build}`
}
