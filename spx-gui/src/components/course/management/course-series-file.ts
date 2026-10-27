import dayjs from 'dayjs'
import { ProgressReporter } from '@/utils/progress'
import { zip, unzip, type Zippable } from '@/utils/zip'
import { extname, filename } from '@/utils/path'
import { forEachConcurrently } from '@/utils/concurrency-limit'
import { Cancelled, capture, DefaultException } from '@/utils/exception'
import type { LocaleMessage } from '@/utils/i18n'
import { getExtFromMime } from '@/utils/file'
import type { FileCollection } from '@/apis/common'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import {
  getCourse,
  addCourse,
  deleteCourse,
  listAllSeriesCourses,
  isGuidedCourse,
  isPlaygroundCourse,
  type AddCourseParams,
  type CourseKind,
  type GuidedCourse,
  type PlaygroundCourse
} from '@/apis/course'
import {
  addCourseSeries,
  getCourseSeries,
  listSignedInUserCourseSeries,
  type AddCourseSeriesParams,
  type CourseSeries,
  type CourseSeriesUnitParams
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
import { TutorialProject } from '@/models/tutorial/project'
import type { DeleteCourse } from '@/stores/course'
import type { UpdateCourseSeries } from '@/stores/course-series'
import { courseKindNames } from './kind'

const manifestFileName = 'course-series.json'
/** How many courses are checked, uploaded or created at a time; a course often has many small files. */
const courseConcurrency = 3
const format = 'xbuilder-course-series'
const version = 3

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

/** A unit of the series: the next `courseCount` courses, after those of the units before it. */
type CourseSeriesFileUnit = {
  title: string
  courseCount: number
}

type CourseSeriesFileManifest = {
  format: typeof format
  version: typeof version
  courseSeries: Pick<CourseSeries, 'title' | 'description'> & {
    /** Missing from files written before series had kinds, which hold a guided series. */
    kind: CourseKind
    thumbnail: CourseSeriesFileThumbnail
  }
  /** Courses of the series' kind, in order. */
  courses: Array<CourseSeriesFileGuidedCourse | CourseSeriesFilePlaygroundCourse>
  /** Units the series is divided into. Missing from files written before series had units, and from undivided ones. */
  units?: CourseSeriesFileUnit[]
  /** Projects the guided courses open; a Playground Course carries its project among its own files. */
  projects: CourseSeriesFileProject[]
}

type ParsedProjectFullName = {
  owner: string
  name: string
}

export type CourseSeriesFileImportInspection = {
  /** The kind of series the file holds. */
  kind: CourseKind
  deletedCourses: string[]
  overwrittenProjects: string[]
}

export async function exportCourseSeriesFile(
  courseSeries: CourseSeries,
  { signal, onProgress }: CourseSeriesFileTaskOptions = {}
) {
  let read = 0
  onProgress?.({ step: 'read', done: read, total: courseSeries.courseIDs.length, files: null })
  const courses = await Promise.all(
    courseSeries.courseIDs.map(async (id) => {
      const course = await getCourse(id, signal)
      onProgress?.({ step: 'read', done: ++read, total: courseSeries.courseIDs.length, files: null })
      return course
    })
  )
  const zippable: Zippable = {}
  const guided = courseSeries.kind === 'guided'
  const guidedCourses = courses.filter(isGuidedCourse)
  const playgroundCourses = courses.filter(isPlaygroundCourse)
  if ((guided ? guidedCourses : playgroundCourses).length !== courses.length) {
    throw new Error(`${courseSeries.kind} courses expected`)
  }
  const projects = collectEntrypointProjects(guidedCourses)
  const sharingName = findProjectsSharingName(projects)
  if (sharingName != null) {
    const { first, second } = sharingName
    throw new DefaultException({
      en: `Cannot export the course series: projects ${first} and ${second} have the same name. Rename one of them.`,
      zh: `无法导出课程系列：项目 ${first} 和 ${second} 同名，请修改其中一个项目的名字`
    })
  }

  // Downloads are counted as they finish: thumbnails, then course files or projects.
  const downloads = {
    done: 0,
    total:
      1 +
      courses.length +
      (guided ? projects.length : playgroundCourses.reduce((n, c) => n + Object.keys(c.content).length, 0))
  }
  const reportDownloads = () =>
    onProgress?.({
      step: 'download',
      done: downloads.done,
      total: downloads.total,
      files: null
    })
  const download: Download = async (path, load) => {
    const data = await load()
    zippable[path] = data
    downloads.done++
    reportDownloads()
  }
  reportDownloads()

  const courseSeriesThumbnail = await exportThumbnail(
    courseSeries.thumbnail,
    'thumbnails/course-series',
    download,
    signal
  )
  let exportedCourses: CourseSeriesFileManifest['courses']
  let exportedProjects: CourseSeriesFileProject[] = []
  if (guided) {
    exportedCourses = await Promise.all(
      guidedCourses.map(
        async (course, index): Promise<CourseSeriesFileGuidedCourse> => ({
          title: course.title,
          content: course.content,
          thumbnail: await exportThumbnail(course.thumbnail, `thumbnails/courses/${index}`, download, signal)
        })
      )
    )
    exportedProjects = await Promise.all(
      projects.map(async (project, index): Promise<CourseSeriesFileProject> => {
        const path = `projects/${index}.xbp`
        await download(path, async () => {
          const serialized = await cloudHelpers.load(project.owner, project.name, true, signal)
          const file = await xbpHelpers.save(serialized, signal)
          return new Uint8Array(await file.arrayBuffer())
        })
        return { fullName: project.fullName, name: project.name, path }
      })
    )
  } else {
    exportedCourses = await Promise.all(
      playgroundCourses.map(async (course, index): Promise<CourseSeriesFilePlaygroundCourse> => {
        const files = `courses/${index}`
        await exportCourseFiles(course.content, files, download, signal)
        return {
          title: course.title,
          thumbnail: await exportThumbnail(course.thumbnail, `thumbnails/courses/${index}`, download, signal),
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
  if (courseSeries.units.length > 0) {
    manifest.units = courseSeries.units.map((unit) => ({ title: unit.title, courseCount: unit.courseIDs.length }))
  }
  zippable[manifestFileName] = new TextEncoder().encode(JSON.stringify(manifest))

  onProgress?.({ step: 'pack', done: 0, total: 0, files: null })
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

/** The steps an import or export of a course series file goes through, as reported to `onProgress`. */
export type CourseSeriesFileStep =
  /** Reading the file to import, or the courses to export. */
  | 'read'
  /** Checking the courses and projects of the file to import. */
  | 'check'
  /** Uploading and creating the projects and courses of the file. */
  | 'upload'
  /** Switching the series to the imported courses, after which an import is no longer cancelled. */
  | 'commit'
  /** Deleting the courses the series held before. */
  | 'cleanup'
  /** Undoing what a failed or cancelled import wrote. */
  | 'undo'
  /** Downloading the files of the courses to export. */
  | 'download'
  /** Packing the file to export. */
  | 'pack'

/** Where an import or export of a course series file is. */
export type CourseSeriesFileProgress = {
  step: CourseSeriesFileStep
  /** Items of the step done, of `total`: courses, projects, files or old courses, by step; `total` is 0 if not counted. */
  done: number
  total: number
  /** Files saved so far during upload; null for steps counted by `done` and `total`. */
  files: { done: number; total: number } | null
}

export type CourseSeriesFileTaskOptions = {
  signal?: AbortSignal
  onProgress?: (progress: CourseSeriesFileProgress) => void
}

export type CourseSeriesFileProblem = {
  /** Title of the course the problem is with. */
  course: string
  problem: LocaleMessage
}

/** A course series file refused for what is wrong with its courses, all of which are in `problems`. */
export class CourseSeriesFileProblems extends DefaultException {
  constructor(readonly problems: CourseSeriesFileProblem[]) {
    super(describeProblems(problems))
  }
}

/** A failed or cancelled import that could not undo all it wrote; the message tells what is left. */
export class CourseSeriesImportNotUndone extends DefaultException {}

/** A course series file, read and checked by `readCourseSeriesFile`, ready to be imported. */
export type CourseSeriesFileContent = Awaited<ReturnType<typeof loadCourseSeriesFile>>

/**
 * Read and check a course series file to import, into `courseSeries` or as a new series when it is null, refusing it
 * with what is wrong before anything is written.
 */
export function readCourseSeriesFile(
  file: globalThis.File,
  courseSeries: CourseSeries | null,
  options: CourseSeriesFileTaskOptions = {}
): Promise<CourseSeriesFileContent> {
  return loadCourseSeriesFile(file, courseSeries?.kind ?? null, options)
}

/** What importing `content` would change: into `courseSeries`, or as a new series when it is null. */
export async function inspectCourseSeriesFileContent(
  content: CourseSeriesFileContent,
  courseSeries: CourseSeries | null,
  signedInUsername: string,
  signal?: AbortSignal
): Promise<CourseSeriesFileImportInspection> {
  let deletedCourses: string[] = []
  if (courseSeries != null && courseSeries.courseIDs.length > 0) {
    const titles = new Map(
      (await listAllSeriesCourses(courseSeries.id, signal)).map((course) => [course.id, course.title])
    )
    deletedCourses = courseSeries.courseIDs.flatMap((id) => titles.get(id) ?? [])
  }
  const overwrittenProjects = await Promise.all(
    content.manifest.projects.map(async (project) => {
      const existingProject = await getSignedInUserProject(signedInUsername, project.name, signal)
      return existingProject?.name ?? null
    })
  )
  return {
    kind: content.manifest.courseSeries.kind,
    deletedCourses,
    overwrittenProjects: [...new Set(overwrittenProjects.filter((p) => p != null))]
  }
}

/**
 * Import `content`: into `target.courseSeries`, replacing its courses, or as a new series of `target.newSeriesOrder`.
 * Should it fail or be cancelled before the series holds the imported courses, what it wrote is undone, and the series
 * is as it was; from then on it is not cancelled, and runs to the end.
 */
export function importCourseSeriesFileContent(
  content: CourseSeriesFileContent,
  target: CourseSeriesImportTarget,
  signedInUsername: string,
  options: CourseSeriesFileTaskOptions = {}
): Promise<CourseSeriesImportResult> {
  return importCourseSeriesFileData(target, content, signedInUsername, options)
}

export type CourseSeriesImportTarget =
  | { courseSeries: CourseSeries; writes: CourseSeriesImportWrites }
  /** A new series, of the given `order`, which the file does not decide: it is relative to the other series here. */
  | { newSeriesOrder: number }

/**
 * Read a course series file of `kind`, or of any kind when it is null, and refuse it with what is wrong before anything
 * is written. Whatever in the file could break an import is read here: the manifest, every thumbnail, every guided
 * project, and every Playground Course, which is loaded to be checked.
 */
async function loadCourseSeriesFile(
  file: globalThis.File,
  kind: CourseKind | null,
  { signal, onProgress }: CourseSeriesFileTaskOptions
) {
  onProgress?.({ step: 'read', done: 0, total: 0, files: null })
  let unzipped: Record<string, Uint8Array<ArrayBuffer>>
  let manifest: CourseSeriesFileManifest
  try {
    unzipped = await unzipFile(file, signal)
    manifest = JSON.parse(new TextDecoder().decode(getRequiredEntry(unzipped, manifestFileName)))
  } catch (e) {
    if (e instanceof Cancelled || e instanceof DefaultException) throw e
    throw new DefaultException({
      en: 'The file is not a course series file, or it is damaged',
      zh: '这个文件不是课程系列文件，或者已经损坏'
    })
  }
  if (manifest.format !== format || manifest.version !== version) {
    throw new DefaultException({
      en: 'Unsupported course series file format',
      zh: '不支持的课程系列文件格式'
    })
  }
  manifest.courseSeries.kind ??= 'guided'
  const fileKind: LocaleMessage | undefined = courseKindNames[manifest.courseSeries.kind]
  if (fileKind == null) {
    throw new DefaultException({
      en: 'The file holds a course series of an unknown kind',
      zh: '文件里的课程系列类型未知'
    })
  }
  if (kind != null && manifest.courseSeries.kind !== kind) {
    throw new DefaultException({
      en: `The file holds a ${fileKind.en} course series, which cannot be imported as a ${courseKindNames[kind].en} one`,
      zh: `文件里是${fileKind.zh}课程系列，不能作为${courseKindNames[kind].zh}课程系列导入`
    })
  }
  for (const thumbnail of [manifest.courseSeries.thumbnail, ...manifest.courses.map((course) => course.thumbnail)]) {
    getRequiredEntry(unzipped, thumbnail.path)
  }
  checkUnits(manifest)
  if (manifest.courseSeries.kind === 'playground') {
    if (manifest.projects.length > 0) {
      throw new DefaultException({
        en: 'Playground courses cannot come with separate projects; each keeps its project among its own files',
        zh: '目标式课程不能单独上传新项目，课程的工程应放在课程自己的文件里'
      })
    }
    const courseFiles = await loadPlaygroundCourseFiles(manifest, unzipped, { signal, onProgress })
    return { manifest, unzipped, courseFiles, projects: [] }
  }
  for (const course of manifest.courses) {
    if (!('content' in course) || typeof course.content?.entrypoint !== 'string') {
      throw new DefaultException({
        en: `Invalid course series file: course "${course.title}" has no entrypoint`,
        zh: `无效的课程系列文件：课程“${course.title}”没有入口`
      })
    }
  }
  const sharingName = findProjectsSharingName(manifest.projects)
  if (sharingName != null) {
    const { first, second } = sharingName
    throw new DefaultException({
      en: `Invalid course series file: projects ${first} and ${second} have the same name. Rename one of them and export the series again.`,
      zh: `无效的课程系列文件：项目 ${first} 和 ${second} 同名，请修改其中一个项目的名字后重新导出`
    })
  }
  const projects = await loadGuidedProjects(manifest, unzipped, { signal, onProgress })
  return { manifest, unzipped, courseFiles: [], projects }
}

/** Refuse units that do not divide the courses of the file. */
function checkUnits({ units, courses }: CourseSeriesFileManifest) {
  if (units == null) return
  const valid =
    Array.isArray(units) &&
    units.every(
      (unit) =>
        typeof unit.title === 'string' &&
        unit.title.trim() !== '' &&
        Number.isInteger(unit.courseCount) &&
        unit.courseCount >= 0
    ) &&
    units.reduce((sum, unit) => sum + unit.courseCount, 0) === courses.length
  if (!valid) {
    throw new DefaultException({
      en: 'Invalid course series file: its units do not match its courses',
      zh: '无效的课程系列文件：单元与课程对不上'
    })
  }
}

/** The units of the file, holding the imported courses: the course at index `i` of the file is `courseIDs[i]`. */
function importUnits(units: CourseSeriesFileUnit[] | undefined, courseIDs: string[]): CourseSeriesUnitParams[] {
  let start = 0
  return (units ?? []).map(({ title, courseCount }) => {
    const unitCourseIDs = courseIDs.slice(start, start + courseCount)
    start += courseCount
    return { title, courseIDs: unitCourseIDs }
  })
}

/**
 * Two projects that have the same name, if any. An import saves each project as the signed-in user's project of its
 * name, so they would overwrite each other; exporting them is refused too, so that a file exported imports again.
 * Names are compared as the backend does, ignoring case, and one project spelled two ways is no conflict.
 */
function findProjectsSharingName(projects: Array<{ fullName: string; name: string }>) {
  const fullNames = new Map<string, string>()
  for (const { fullName, name } of projects) {
    const first = fullNames.get(name.toLowerCase())
    if (first == null) fullNames.set(name.toLowerCase(), fullName)
    else if (projectKey(first) !== projectKey(fullName)) return { first, second: fullName }
  }
  return null
}

/** What tells a project apart: the backend ignores case in owners and project names. */
function projectKey(fullName: string) {
  return fullName.toLowerCase()
}

/** The projects the file holds for its guided courses, in the order of `manifest.projects`. */
async function loadGuidedProjects(
  manifest: CourseSeriesFileManifest,
  unzipped: Record<string, Uint8Array<ArrayBuffer>>,
  { signal, onProgress }: CourseSeriesFileTaskOptions
) {
  const projects: ProjectSerialized[] = []
  const total = manifest.projects.length
  onProgress?.({ step: 'check', done: 0, total, files: null })
  for (const project of manifest.projects) {
    signal?.throwIfAborted()
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
    onProgress?.({ step: 'check', done: projects.length, total, files: null })
  }
  return projects
}

/**
 * The files of each Playground Course in the file, once every course loads. What its program
 * refers to is not checked, as the Course Editor saves a course without checking it either, and a series exported must
 * import again.
 */
async function loadPlaygroundCourseFiles(
  manifest: CourseSeriesFileManifest,
  unzipped: Record<string, Uint8Array<ArrayBuffer>>,
  { signal, onProgress }: CourseSeriesFileTaskOptions
) {
  const courseFiles: Files[] = manifest.courses.map((course) => {
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
    return files
  })

  const total = manifest.courses.length
  let done = 0
  onProgress?.({ step: 'check', done, total, files: null })
  const problems: Array<CourseSeriesFileProblem | null> = manifest.courses.map(() => null)
  await forEachConcurrently(manifest.courses, courseConcurrency, async (course, index) => {
    signal?.throwIfAborted()
    const project = new TutorialProject()
    try {
      await project.loadFiles(courseFiles[index])
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      problems[index] = {
        course: course.title,
        problem: { en: `The course cannot be loaded: ${message}`, zh: `课程无法加载：${message}` }
      }
    } finally {
      project.dispose()
    }
    onProgress?.({ step: 'check', done: ++done, total, files: null })
  })
  const found = problems.filter((problem) => problem != null)
  if (found.length > 0) throw new CourseSeriesFileProblems(found)
  return courseFiles
}

function describeProblems(problems: CourseSeriesFileProblem[]): LocaleMessage {
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
      (more > 0 ? `；另有 ${more} 处问题` : '')
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
  target: CourseSeriesImportTarget,
  { manifest, unzipped, courseFiles, projects }: CourseSeriesFileContent,
  signedInUsername: string,
  { signal, onProgress }: CourseSeriesFileTaskOptions
): Promise<CourseSeriesImportResult> {
  const into = 'courseSeries' in target ? target : null
  const courseSeries = into?.courseSeries ?? null
  const changes: ImportChanges = { courseIDs: [], createdProjects: [], overwrittenProjects: [] }
  let params: AddCourseSeriesParams
  // Other files of a course whose upload failed go on saving, and report after the upload step has ended.
  let uploading = true
  try {
    // Files written before projects were told apart ignoring case may hold one project twice, spelled two ways.
    const projectIndexes = manifest.projects.flatMap((project, index) =>
      manifest.projects.findIndex((p) => projectKey(p.fullName) === projectKey(project.fullName)) === index
        ? [index]
        : []
    )
    const courseFileCounts = courseFiles.map((files) => Object.keys(files).length)
    const totalFiles = courseFileCounts.reduce((sum, count) => sum + count, 0)
    const uploaded = courseFiles.map(() => 0)
    const total = projectIndexes.length + manifest.courses.length
    let done = 0
    const report = () => {
      if (!uploading) return
      onProgress?.({
        step: 'upload',
        done,
        total,
        files:
          courseFiles.length === 0
            ? null
            : {
                done: uploaded.reduce((sum, count) => sum + count, 0),
                total: totalFiles
              }
      })
    }
    report()

    const projectFullNameMap = new Map<string, string>()
    for (const index of projectIndexes) {
      const project = manifest.projects[index]
      signal?.throwIfAborted()
      const importedFullName = await importProject(
        project,
        projects[index],
        manifest,
        signedInUsername,
        changes,
        signal
      )
      projectFullNameMap.set(projectKey(project.fullName), importedFullName)
      done++
      report()
    }

    const courseIDs: string[] = []
    await forEachConcurrently(manifest.courses, courseConcurrency, async (course, index) => {
      signal?.throwIfAborted()
      const thumbnail = await importThumbnail(course.thumbnail, unzipped, signal)
      const courseParams: AddCourseParams =
        'files' in course
          ? {
              title: course.title,
              thumbnail,
              kind: 'playground',
              content: (
                await saveFiles(
                  courseFiles[index],
                  signal,
                  new ProgressReporter(({ percentage }) => {
                    uploaded[index] = Math.round(courseFileCounts[index] * percentage)
                    report()
                  })
                )
              ).fileCollection
            }
          : {
              title: course.title,
              thumbnail,
              kind: 'guided',
              content: {
                entrypoint: rewriteProjectFullNames(course.content.entrypoint, projectFullNameMap),
                prompt: course.content.prompt
              }
            }
      signal?.throwIfAborted()
      // Not cancelled once sent: a course created by a request cut short would be left out of the undoing, which needs
      // its ID.
      const imported = await addCourse(courseParams)
      changes.courseIDs.push(imported.id)
      courseIDs[index] = imported.id
      done++
      report()
    })

    params = {
      kind: manifest.courseSeries.kind,
      title: manifest.courseSeries.title,
      thumbnail: await importThumbnail(manifest.courseSeries.thumbnail, unzipped, signal),
      description: manifest.courseSeries.description,
      // Keep the local sort order because it depends on other course series in the current environment.
      order: 'courseSeries' in target ? target.courseSeries.order : target.newSeriesOrder,
      courseIDs,
      // Units of the series imported into are replaced too, by none if the file has none.
      units: importUnits(manifest.units, courseIDs)
    }
    signal?.throwIfAborted()
  } catch (error) {
    uploading = false
    onProgress?.({ step: 'undo', done: 0, total: 0, files: null })
    return undoImport(changes, manifest, error)
  }
  uploading = false

  // From here on the import is not cancelled: once the series may hold the imported courses, stopping would leave it
  // part done.
  onProgress?.({ step: 'commit', done: 0, total: 1, files: null })
  let importedCourseSeries: CourseSeries
  try {
    importedCourseSeries =
      into == null ? await addCourseSeries(params) : await into.writes.updateCourseSeries(into.courseSeries.id, params)
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
    if (committed == null) {
      onProgress?.({ step: 'undo', done: 0, total: 0, files: null })
      return undoImport(changes, manifest, error)
    }
    importedCourseSeries = committed
  }

  const undeletedCourseIDs: string[] = []
  if (into != null) {
    const oldCourseIDs = into.courseSeries.courseIDs
    let deleted = 0
    onProgress?.({ step: 'cleanup', done: deleted, total: oldCourseIDs.length, files: null })
    const results = await Promise.allSettled(
      oldCourseIDs.map(async (courseID) => {
        try {
          await into.writes.deleteCourse(courseID)
        } finally {
          onProgress?.({ step: 'cleanup', done: ++deleted, total: oldCourseIDs.length, files: null })
        }
      })
    )
    results.forEach((result, index) => {
      if (result.status === 'rejected') undeletedCourseIDs.push(oldCourseIDs[index])
    })
  }
  return { courseSeries: importedCourseSeries, undeletedCourseIDs }
}

/**
 * The series as a commit whose answer was lost left it, when it holds the imported courses; null otherwise. It takes
 * no signal on purpose: like undoing, finding out whether there is anything to undo must not stop when the import is
 * cancelled.
 */
async function findCommittedCourseSeries(courseSeries: CourseSeries | null, params: AddCourseSeriesParams) {
  // Without imported courses, a series the commit changed cannot be told from one it did not.
  if (params.courseIDs.length === 0) return null
  const holdsImportedCourses = (series: CourseSeries) =>
    series.courseIDs.length === params.courseIDs.length &&
    series.courseIDs.every((id, index) => id === params.courseIDs[index])
  if (courseSeries != null) {
    const series = await getCourseSeries(courseSeries.id)
    return holdsImportedCourses(series) ? series : null
  }
  // The imported courses are new, so a series holding them can only be the one this import created, among the newest.
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
  throw new CourseSeriesImportNotUndone({
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

/** Put the data `load` gives at `path` in the file to export, counting it as downloaded. */
type Download = (path: string, load: () => Promise<Uint8Array<ArrayBuffer>>) => Promise<void>

async function exportCourseFiles(content: FileCollection, dir: string, download: Download, signal?: AbortSignal) {
  await Promise.all(
    Object.entries(content).map(([path, universalUrl]) =>
      download(
        `${dir}/${path}`,
        async () => new Uint8Array(await createFileWithUniversalUrl(universalUrl).arrayBuffer(signal))
      )
    )
  )
}

async function exportThumbnail(
  universalUrl: string,
  pathWithoutExt: string,
  download: Download,
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
  await download(path, async () => new Uint8Array(await file.arrayBuffer(signal)))
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
    if (entrypointProject == null) continue
    const key = projectKey(entrypointProject.fullName)
    if (!projects.has(key)) projects.set(key, entrypointProject)
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
  const target = projectFullNameMap.get(projectKey(source))
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

/** A file of `data`, which shares an entry's own buffer instead of copying it, as `xbp.ts` does. */
function createLazyFile(path: string, data: Uint8Array<ArrayBuffer>) {
  const ownsBuffer = data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
  return new LazyFile(path, () =>
    Promise.resolve(ownsBuffer ? data.buffer : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
  )
}

/** The entries of a zip file, read in a function of its own so that the archive is let go of once it is unzipped. */
async function unzipFile(file: globalThis.File, signal?: AbortSignal) {
  return unzip(new Uint8Array(await file.arrayBuffer()), { signal })
}

function generateReleaseName() {
  const timeStr = dayjs().tz('UTC').format('YYYYMMDDHHmmss')
  const build = `${timeStr}.${Math.random().toString(16).slice(2, 8)}`
  return `v0.0.0+${build}`
}
