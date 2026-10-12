import dayjs from 'dayjs'
import { zip, unzip, type Zippable } from '@/utils/zip'
import { extname, filename } from '@/utils/path'
import { capture, DefaultException } from '@/utils/exception'
import type { LocaleMessage } from '@/utils/i18n'
import { getExtFromMime } from '@/utils/file'
import type { FileCollection } from '@/apis/common'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import {
  getCourse,
  addCourse,
  deleteCourse,
  isGuidedCourse,
  isPlaygroundCourse,
  type CourseKind,
  type GuidedCourse,
  type PlaygroundCourse
} from '@/apis/course'
import { addCourseSeries, type CourseSeries } from '@/apis/course-series'
import {
  deleteProject,
  getProject,
  ProjectType,
  updateProject,
  Visibility,
  type UpdateProjectParams
} from '@/apis/project'
import { createProjectRelease } from '@/apis/project-release'
import { cloudHelpers, createFileWithUniversalUrl, saveFile, saveFiles } from '@/models/common/cloud'
import { File as LazyFile, type Files } from '@/models/common/file'
import { xbpHelpers } from '@/models/common/xbp'
import type { Metadata, PartialMetadata, ProjectSerialized } from '@/models/project'
import type { DeleteCourse } from '@/stores/course'
import type { UpdateCourseSeries } from '@/stores/course-series'
import { checkPlaygroundCourse } from './playground/course-check'

const manifestFileName = 'course-series.json'
const format = 'xbuilder-course-series'
const version = 4

type CourseSeriesFileThumbnail = {
  path: string
}

type CourseSeriesFileGuidedCourse = Pick<GuidedCourse, 'title' | 'content'> & {
  thumbnail: CourseSeriesFileThumbnail
}

type CourseSeriesFilePlaygroundCourse = Pick<PlaygroundCourse, 'title'> & {
  thumbnail: CourseSeriesFileThumbnail
  /** Directory of the file holding the course's files, each at its path in the course. */
  files: string
}

type CourseSeriesFileProject = {
  fullName: string
  name: string
  path: string
}

type CourseSeriesFileManifest = {
  format: typeof format
  version: typeof version
  courseSeries: Pick<CourseSeries, 'kind' | 'title' | 'description'> & {
    thumbnail: CourseSeriesFileThumbnail
  }
  /** Courses of the series' kind, in order. */
  courses: Array<CourseSeriesFileGuidedCourse | CourseSeriesFilePlaygroundCourse>
  /** Projects the guided courses open; a Playground Course carries its project among its own files. */
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
  const zippable: Zippable = {}

  const courseSeriesThumbnail = await exportThumbnail(
    courseSeries.thumbnail,
    'thumbnails/course-series',
    zippable,
    signal
  )
  let exportedCourses: CourseSeriesFileManifest['courses']
  let exportedProjects: CourseSeriesFileProject[] = []
  if (courseSeries.kind === 'guided') {
    if (!courses.every(isGuidedCourse)) throw new Error('Guided courses expected')
    exportedCourses = await Promise.all(
      courses.map(
        async (course, index): Promise<CourseSeriesFileGuidedCourse> => ({
          title: course.title,
          content: course.content,
          thumbnail: await exportThumbnail(course.thumbnail, `thumbnails/courses/${index}`, zippable, signal)
        })
      )
    )
    exportedProjects = await Promise.all(
      collectEntrypointProjects(courses).map(async (project, index): Promise<CourseSeriesFileProject> => {
        const serialized = await cloudHelpers.load(project.owner, project.name, true, signal)
        const file = await xbpHelpers.save(serialized, signal)
        const path = `projects/${index}.xbp`
        zippable[path] = new Uint8Array(await file.arrayBuffer())
        return { fullName: project.fullName, name: project.name, path }
      })
    )
  } else {
    if (!courses.every(isPlaygroundCourse)) throw new Error('Playground courses expected')
    exportedCourses = await Promise.all(
      courses.map(async (course, index): Promise<CourseSeriesFilePlaygroundCourse> => {
        const files = `courses/${index}`
        await exportCourseFiles(course.content, files, zippable, signal)
        return {
          title: course.title,
          thumbnail: await exportThumbnail(course.thumbnail, `thumbnails/courses/${index}`, zippable, signal),
          files
        }
      })
    )
  }

  const manifest: CourseSeriesFileManifest = {
    format,
    version,
    courseSeries: {
      kind: courseSeries.kind,
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

/** Writes that keep cached courses and series in step, from `stores/course` and `stores/course-series`. */
export type CourseSeriesImportWrites = {
  updateCourseSeries: UpdateCourseSeries
  deleteCourse: DeleteCourse
}

export type CourseSeriesImportResult = {
  courseSeries: CourseSeries
  /** Courses the series held before, which could not be deleted once it held the imported ones. */
  undeletedCourseIDs: string[]
}

/**
 * Replace the courses of `courseSeries` with those of the file. Should it fail before the series holds the imported
 * courses, what it wrote is undone: the series is then as it was.
 */
export async function importCourseSeriesFile(
  courseSeries: CourseSeries,
  file: globalThis.File,
  signedInUsername: string,
  writes: CourseSeriesImportWrites,
  signal?: AbortSignal
) {
  const data = await loadCourseSeriesFile(file, courseSeries.kind, signal)
  return importCourseSeriesFileData({ courseSeries, writes }, data, signedInUsername, signal)
}

export async function importCourseSeriesFileAsNew(
  file: globalThis.File,
  kind: CourseKind,
  signedInUsername: string,
  signal?: AbortSignal
) {
  const data = await loadCourseSeriesFile(file, kind, signal)
  return importCourseSeriesFileData(null, data, signedInUsername, signal)
}

export async function inspectCourseSeriesFileImport(
  courseSeries: CourseSeries | null,
  kind: CourseKind,
  file: globalThis.File,
  signedInUsername: string,
  signal?: AbortSignal
): Promise<CourseSeriesFileImportInspection> {
  const data = await loadCourseSeriesFile(file, kind, signal)
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

/**
 * Read a course series file of `kind`. A Playground series is checked course by course before anything is written,
 * and refused with what is wrong if any course has a problem.
 */
async function loadCourseSeriesFile(file: globalThis.File, kind: CourseKind, signal?: AbortSignal) {
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
  if (manifest.courseSeries.kind !== kind) {
    const fileKind = kindNames[manifest.courseSeries.kind] ?? { en: 'unknown', zh: '未知' }
    throw new DefaultException({
      en: `The file holds a ${fileKind.en} course series, which cannot be imported as a ${kindNames[kind].en} one`,
      zh: `文件里是${fileKind.zh}课程系列，不能作为${kindNames[kind].zh}课程系列导入`
    })
  }
  const courseFiles = kind === 'playground' ? await loadPlaygroundCourseFiles(manifest, unzipped) : []
  return { manifest, unzipped, courseFiles }
}

const kindNames: Record<CourseKind, LocaleMessage> = {
  guided: { en: 'Guided', zh: '引导式' },
  playground: { en: 'Playground', zh: '目标式' }
}

/** The files of each Playground Course in the file, once all of them pass `checkPlaygroundCourse`. */
async function loadPlaygroundCourseFiles(
  manifest: CourseSeriesFileManifest,
  unzipped: Record<string, Uint8Array<ArrayBuffer>>
) {
  const problems: Array<{ course: string; problem: LocaleMessage }> = []
  const courseFiles: Files[] = []
  for (const course of manifest.courses) {
    if (!('files' in course) || typeof course.files !== 'string') {
      throw new DefaultException({
        en: `Invalid course series file: course "${course.title}" has no files`,
        zh: `无效的课程系列文件：课程“${course.title}”没有文件`
      })
    }
    const prefix = `${course.files}/`
    const files: Files = {}
    for (const [path, data] of Object.entries(unzipped)) {
      // Some zip tools list directories too, as entries ending with a slash.
      if (!path.startsWith(prefix) || path.endsWith('/')) continue
      const coursePath = path.slice(prefix.length)
      files[coursePath] = createLazyFile(filename(coursePath), data)
    }
    for (const problem of await checkPlaygroundCourse(files)) problems.push({ course: course.title, problem })
    courseFiles.push(files)
  }
  if (problems.length > 0) throw new DefaultException(describeProblems(problems))
  return courseFiles
}

function describeProblems(problems: Array<{ course: string; problem: LocaleMessage }>): LocaleMessage {
  const shown = problems.slice(0, 3)
  const more = problems.length - shown.length
  return {
    en:
      'The course series file cannot be imported: ' +
      shown.map(({ course, problem }) => `"${course}": ${problem.en}`).join('; ') +
      (more > 0 ? `; and ${more} more` : ''),
    zh:
      '课程系列文件无法导入：' +
      shown.map(({ course, problem }) => `课程“${course}”：${problem.zh}`).join('；') +
      (more > 0 ? `；共 ${problems.length} 处问题` : '')
  }
}

/** What an import wrote before its series held the imported courses, which a failure undoes. */
type ImportChanges = {
  courseIDs: string[]
  createdProjects: Array<{ owner: string; name: string }>
  /** Projects the import overwrote, as they were before. */
  overwrittenProjects: Array<ProjectSerialized<Metadata>>
}

async function importCourseSeriesFileData(
  target: { courseSeries: CourseSeries; writes: CourseSeriesImportWrites } | null,
  { manifest, unzipped, courseFiles }: Awaited<ReturnType<typeof loadCourseSeriesFile>>,
  signedInUsername: string,
  signal?: AbortSignal
): Promise<CourseSeriesImportResult> {
  const courseSeries = target?.courseSeries ?? null
  const changes: ImportChanges = { courseIDs: [], createdProjects: [], overwrittenProjects: [] }
  let importedCourseSeries: CourseSeries
  try {
    const projectFullNameMap = new Map<string, string>()
    for (const project of manifest.projects) {
      const importedFullName = await importProject(project, manifest, unzipped, signedInUsername, changes, signal)
      projectFullNameMap.set(project.fullName, importedFullName)
    }

    for (const [index, course] of manifest.courses.entries()) {
      const thumbnail = await importThumbnail(course.thumbnail, unzipped, signal)
      const imported =
        'files' in course
          ? await addCourse(
              {
                title: course.title,
                thumbnail,
                kind: 'playground',
                content: (await saveFiles(courseFiles[index], signal)).fileCollection
              },
              signal
            )
          : await addCourse(
              {
                title: course.title,
                thumbnail,
                kind: 'guided',
                content: {
                  entrypoint: rewriteProjectFullNames(course.content.entrypoint, projectFullNameMap),
                  prompt: course.content.prompt
                }
              },
              signal
            )
      changes.courseIDs.push(imported.id)
    }

    const params = {
      kind: manifest.courseSeries.kind,
      title: manifest.courseSeries.title,
      thumbnail: await importThumbnail(manifest.courseSeries.thumbnail, unzipped, signal),
      description: manifest.courseSeries.description,
      // Keep the local sort order because it depends on other course series in the current environment.
      order: courseSeries?.order ?? 1,
      courseIDs: changes.courseIDs
    }
    // The series holds the imported courses from here on, so nothing before this needs undoing any more.
    importedCourseSeries =
      target == null
        ? await addCourseSeries(params, signal)
        : await target.writes.updateCourseSeries(target.courseSeries.id, params, signal)
  } catch (error) {
    return undoImport(changes, manifest, error)
  }

  const undeletedCourseIDs: string[] = []
  if (target != null) {
    const oldCourseIDs = target.courseSeries.courseIDs
    const results = await Promise.allSettled(oldCourseIDs.map((courseID) => target.writes.deleteCourse(courseID)))
    results.forEach((result, index) => {
      if (result.status === 'rejected') undeletedCourseIDs.push(oldCourseIDs[index])
    })
  }
  return { courseSeries: importedCourseSeries, undeletedCourseIDs }
}

/**
 * Undo what a failed import wrote: delete the courses and projects it created and restore the projects it
 * overwrote. Rethrows the failure, or reports what could not be undone. Files it uploaded are left behind, as nothing
 * refers to them.
 */
async function undoImport(changes: ImportChanges, manifest: CourseSeriesFileManifest, error: unknown): Promise<never> {
  const notUndone: string[] = []
  for (const courseID of changes.courseIDs) {
    try {
      await deleteCourse(courseID)
    } catch (e) {
      capture(e, 'failed to delete an imported course while undoing the import')
      notUndone.push(courseID)
    }
  }
  for (const backup of changes.overwrittenProjects) {
    try {
      await restoreProject(backup, manifest)
    } catch (e) {
      capture(e, 'failed to restore an overwritten project while undoing the import')
      notUndone.push(`${backup.metadata.owner}/${backup.metadata.name}`)
    }
  }
  for (const { owner, name } of changes.createdProjects) {
    try {
      await deleteProject(owner, name)
    } catch (e) {
      capture(e, 'failed to delete an imported project while undoing the import')
      notUndone.push(`${owner}/${name}`)
    }
  }
  if (notUndone.length === 0) throw error
  capture(error, 'failed to import course series file')
  throw new DefaultException({
    en: `Failed to import the course series file, and some changes could not be undone: ${notUndone.join(', ')}`,
    zh: `导入课程系列文件失败，且以下改动未能还原：${notUndone.join('、')}`
  })
}

/** Write an overwritten project back as it was, and publish it again so that its published content is too. */
async function restoreProject(backup: ProjectSerialized<Metadata>, manifest: CourseSeriesFileManifest) {
  const restored = await cloudHelpers.save(backup)
  const { owner, name } = restored.metadata
  let revision = restored.metadata.revision
  if (backup.metadata.extraSettings != null) {
    revision = (await updateProject(owner, name, { extraSettings: backup.metadata.extraSettings })).revision
  }
  await createProjectRelease(owner, name, {
    name: generateReleaseName(),
    description: `Restored after a failed import of course series "${manifest.courseSeries.title}"`,
    projectRevision: revision
  })
}

async function exportCourseFiles(content: FileCollection, dir: string, zippable: Zippable, signal?: AbortSignal) {
  await Promise.all(
    Object.entries(content).map(async ([path, universalUrl]) => {
      const file = createFileWithUniversalUrl(universalUrl)
      zippable[`${dir}/${path}`] = new Uint8Array(await file.arrayBuffer(signal))
    })
  )
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

function collectEntrypointProjects(courses: GuidedCourse[]) {
  const projects = new Map<string, ParsedProjectFullName & { fullName: string }>()
  for (const course of courses) {
    const entrypointProject = parseEditorProjectFullName(course.content.entrypoint)
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
      en: `Invalid project full name: ${fullName}`,
      zh: `无效的项目完整名称：${fullName}`
    })
  }
  return { owner: decodeURIComponent(parts[0]), name: decodeURIComponent(parts[1]) }
}

async function importProject(
  project: CourseSeriesFileProject,
  manifest: CourseSeriesFileManifest,
  unzipped: Record<string, Uint8Array<ArrayBuffer>>,
  signedInUsername: string,
  changes: ImportChanges,
  signal?: AbortSignal
) {
  const serialized = await xbpHelpers.load(new File([getRequiredEntry(unzipped, project.path)], `${project.name}.xbp`))
  const existingProject = await getSignedInUserProject(signedInUsername, project.name, signal)
  if (existingProject != null) {
    changes.overwrittenProjects.push(
      await cloudHelpers.load(existingProject.owner, existingProject.name, false, signal)
    )
  }
  const metadata: PartialMetadata = {
    ...serialized.metadata,
    id: existingProject?.id,
    owner: existingProject?.owner ?? signedInUsername,
    name: existingProject?.name ?? project.name,
    displayName: serialized.metadata.displayName ?? project.name,
    type: serialized.metadata.type ?? ProjectType.Game,
    visibility: Visibility.Public
  }

  const saved = await cloudHelpers.save({ metadata, files: serialized.files }, signal)
  let { owner, name, revision } = saved.metadata
  if (existingProject == null) changes.createdProjects.push({ owner, name })
  const metadataUpdates: UpdateProjectParams = {}
  if (serialized.metadata.description != null) metadataUpdates.description = serialized.metadata.description
  if (serialized.metadata.instructions != null) metadataUpdates.instructions = serialized.metadata.instructions
  if (serialized.metadata.extraSettings != null) metadataUpdates.extraSettings = serialized.metadata.extraSettings
  if (Object.keys(metadataUpdates).length > 0) {
    const updated = await updateProject(owner, name, metadataUpdates, signal)
    owner = updated.owner
    name = updated.name
    revision = updated.revision
  }
  await createProjectRelease(
    owner,
    name,
    {
      name: generateReleaseName(),
      description: `Imported from course series "${manifest.courseSeries.title}"`,
      projectRevision: revision
    },
    signal
  )
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
