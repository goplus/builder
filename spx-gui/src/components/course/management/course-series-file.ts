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
import {
  addCourseSeries,
  getCourseSeries,
  listSignedInUserCourseSeries,
  type AddCourseSeriesParams,
  type CourseSeries
} from '@/apis/course-series'
import {
  deleteProject,
  getProject,
  ProjectType,
  updateProject,
  Visibility,
  type ProjectData,
  type UpdateProjectParams
} from '@/apis/project'
import { createProjectRelease } from '@/apis/project-release'
import { cloudHelpers, createFileWithUniversalUrl, saveFile, saveFiles } from '@/models/common/cloud'
import { File as LazyFile, type Files } from '@/models/common/file'
import { xbpHelpers } from '@/models/common/xbp'
import type { PartialMetadata, ProjectSerialized } from '@/models/project'
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
 * Read a course series file of `kind`, and refuse it with what is wrong before anything is written. Whatever in the
 * file could break an import is read here: the manifest, every thumbnail, every guided project, and every Playground
 * Course, which is loaded and checked course by course.
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
  for (const thumbnail of [manifest.courseSeries.thumbnail, ...manifest.courses.map((course) => course.thumbnail)]) {
    getRequiredEntry(unzipped, thumbnail.path)
  }
  if (kind === 'playground') {
    if (manifest.projects.length > 0) {
      throw new DefaultException({
        en: 'Playground courses cannot come with separate projects; each keeps its project among its own files',
        zh: '目标式课程不能单独上传新项目，课程的工程应放在课程自己的文件里'
      })
    }
    return { manifest, unzipped, courseFiles: await loadPlaygroundCourseFiles(manifest, unzipped), projects: [] }
  }
  for (const course of manifest.courses) {
    if (!('content' in course) || typeof course.content?.entrypoint !== 'string') {
      throw new DefaultException({
        en: `Invalid course series file: course "${course.title}" has no entrypoint`,
        zh: `无效的课程系列文件：课程“${course.title}”没有入口`
      })
    }
  }
  return { manifest, unzipped, courseFiles: [], projects: await loadGuidedProjects(manifest, unzipped) }
}

/** The projects the file holds for its guided courses, in the order of `manifest.projects`. */
async function loadGuidedProjects(
  manifest: CourseSeriesFileManifest,
  unzipped: Record<string, Uint8Array<ArrayBuffer>>
) {
  const projects: ProjectSerialized[] = []
  for (const project of manifest.projects) {
    const entry = getRequiredEntry(unzipped, project.path)
    try {
      projects.push(await xbpHelpers.load(new File([entry], `${project.name}.xbp`)))
    } catch (e) {
      capture(e, 'failed to read a project in a course series file')
      throw new DefaultException({
        en: `Invalid course series file: project "${project.name}" cannot be read`,
        zh: `无效的课程系列文件：项目“${project.name}”无法读取`
      })
    }
  }
  return projects
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

/**
 * What an import may have written before its series held the imported courses, which a failure undoes. Projects are
 * recorded before they are written, as an answer can be lost after the write took effect; undoing finds out what
 * actually changed.
 */
type ImportChanges = {
  courseIDs: string[]
  createdProjects: Array<{ owner: string; name: string }>
  /** Projects the import may have overwritten, as they were before. */
  overwrittenProjects: ProjectData[]
}

/**
 * Write what `loadCourseSeriesFile` read. The file itself was checked there, so what can still go wrong here is
 * outside it: an upload or request that fails, the server refusing a value (its own checks, such as lengths, are not
 * repeated here), or an answer that never arrives. Hence:
 * - a failure before the commit, the series write that switches to the imported courses, undoes all written so far;
 * - a failed commit is checked against the series first, since it may have taken effect with its answer lost;
 * - after the commit the import stands, and old courses that cannot be deleted are only reported.
 */
async function importCourseSeriesFileData(
  target: { courseSeries: CourseSeries; writes: CourseSeriesImportWrites } | null,
  { manifest, unzipped, courseFiles, projects }: Awaited<ReturnType<typeof loadCourseSeriesFile>>,
  signedInUsername: string,
  signal?: AbortSignal
): Promise<CourseSeriesImportResult> {
  const courseSeries = target?.courseSeries ?? null
  const changes: ImportChanges = { courseIDs: [], createdProjects: [], overwrittenProjects: [] }
  let params: AddCourseSeriesParams
  try {
    const projectFullNameMap = new Map<string, string>()
    for (const [index, project] of manifest.projects.entries()) {
      const importedFullName = await importProject(
        project,
        projects[index],
        manifest,
        signedInUsername,
        changes,
        signal
      )
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

    params = {
      kind: manifest.courseSeries.kind,
      title: manifest.courseSeries.title,
      thumbnail: await importThumbnail(manifest.courseSeries.thumbnail, unzipped, signal),
      description: manifest.courseSeries.description,
      // Keep the local sort order because it depends on other course series in the current environment.
      order: courseSeries?.order ?? 1,
      courseIDs: changes.courseIDs
    }
  } catch (error) {
    return undoImport(changes, manifest, error)
  }

  let importedCourseSeries: CourseSeries
  try {
    importedCourseSeries =
      target == null
        ? await addCourseSeries(params, signal)
        : await target.writes.updateCourseSeries(target.courseSeries.id, params, signal)
  } catch (error) {
    let committed: CourseSeries | null
    try {
      committed = await findCommittedCourseSeries(courseSeries, params)
    } catch (e) {
      // Undoing now could empty a series that holds the imported courses, so nothing is undone.
      capture(e, 'failed to check the course series after its update failed')
      capture(error, 'failed to import course series file')
      throw new DefaultException({
        en: 'Could not tell whether the course series file was imported. Check the course series before importing it again.',
        zh: '无法确认课程系列文件是否已导入，请先查看课程系列再决定是否重新导入。'
      })
    }
    if (committed == null) return undoImport(changes, manifest, error)
    importedCourseSeries = committed
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

/** The series as a commit whose answer was lost left it, when it holds the imported courses; null otherwise. */
async function findCommittedCourseSeries(courseSeries: CourseSeries | null, params: AddCourseSeriesParams) {
  const holdsImportedCourses = (series: CourseSeries) =>
    series.courseIDs.length === params.courseIDs.length &&
    series.courseIDs.every((id, index) => id === params.courseIDs[index])
  if (courseSeries != null) {
    const series = await getCourseSeries(courseSeries.id)
    return holdsImportedCourses(series) ? series : null
  }
  // The imported courses are new, so a series holding them can only be the one this import created, among the newest.
  if (params.courseIDs.length === 0) return null
  const { data } = await listSignedInUserCourseSeries({
    kind: params.kind,
    orderBy: 'createdAt',
    sortOrder: 'desc',
    pageIndex: 1,
    pageSize: 10
  })
  return data.find(holdsImportedCourses) ?? null
}

/**
 * Undo what a failed import wrote: delete the courses and projects it created and restore the projects it
 * overwrote. Rethrows the failure, or reports what could not be undone. Files it uploaded are left behind, as nothing
 * refers to them.
 */
async function undoImport(changes: ImportChanges, manifest: CourseSeriesFileManifest, error: unknown): Promise<never> {
  const notUndone: LocaleMessage[] = []
  for (const courseID of changes.courseIDs) {
    try {
      await deleteCourse(courseID)
    } catch (e) {
      capture(e, 'failed to delete an imported course while undoing the import')
      notUndone.push({ en: `course ${courseID}`, zh: `课程 ${courseID}` })
    }
  }
  for (const backup of changes.overwrittenProjects) {
    const fullName = `${backup.owner}/${backup.name}`
    try {
      if (!(await restoreProject(backup, manifest))) {
        notUndone.push({
          en: `the release the import made of project ${fullName}`,
          zh: `导入为项目 ${fullName} 创建的发布版本`
        })
      }
    } catch (e) {
      capture(e, 'failed to restore an overwritten project while undoing the import')
      notUndone.push({ en: `project ${fullName}`, zh: `项目 ${fullName}` })
    }
  }
  for (const { owner, name } of changes.createdProjects) {
    try {
      await deleteProject(owner, name)
    } catch (e) {
      // Not found: the import failed before creating it.
      if (e instanceof ApiException && e.code === ApiExceptionCode.errorNotFound) continue
      capture(e, 'failed to delete an imported project while undoing the import')
      notUndone.push({ en: `project ${owner}/${name}`, zh: `项目 ${owner}/${name}` })
    }
  }
  if (notUndone.length === 0) throw error
  capture(error, 'failed to import course series file')
  throw new DefaultException({
    en: `Failed to import the course series file, and some changes could not be undone: ${notUndone.map((m) => m.en).join(', ')}`,
    zh: `导入课程系列文件失败，且以下改动未能还原：${notUndone.map((m) => m.zh).join('、')}`
  })
}

/**
 * Put a project the import overwrote back as `backup` has it, both what it holds and what it has published, going by
 * what the import actually changed. Returns false when the import published a project that had no release before:
 * a release cannot be removed, so that one stays.
 */
async function restoreProject(backup: ProjectData, manifest: CourseSeriesFileManifest) {
  const { owner, name } = backup
  const current = await getProject(owner, name)
  if (current.revision === backup.revision) return true

  const published = backup.latestRelease
  const releasedByImport = (current.latestRelease?.id ?? null) !== (published?.id ?? null)
  if (releasedByImport && published != null) {
    // A release is made of the project as it is, so its published content goes back first, the rest over it.
    const { revision } = await updateProject(owner, name, { files: published.files, thumbnail: published.thumbnail })
    await createProjectRelease(owner, name, {
      name: generateReleaseName(),
      description: `Restored after a failed import of course series "${manifest.courseSeries.title}"`,
      projectRevision: revision
    })
  }
  const { files, visibility, displayName, description, instructions, extraSettings, thumbnail } = backup
  await updateProject(owner, name, {
    files,
    visibility,
    displayName,
    description,
    instructions,
    extraSettings,
    thumbnail
  })
  return !releasedByImport || published != null
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
  serialized: ProjectSerialized,
  manifest: CourseSeriesFileManifest,
  signedInUsername: string,
  changes: ImportChanges,
  signal?: AbortSignal
) {
  const existingProject = await getSignedInUserProject(signedInUsername, project.name, signal)
  let created: { owner: string; name: string } | null = null
  if (existingProject != null) {
    changes.overwrittenProjects.push(existingProject)
  } else {
    created = { owner: signedInUsername, name: project.name }
    changes.createdProjects.push(created)
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
  if (created != null) Object.assign(created, { owner, name })
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
