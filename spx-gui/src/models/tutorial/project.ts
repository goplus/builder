import { reactive } from 'vue'

import type { PlaygroundCourse } from '@/apis/course'
import { getFiles } from '@/models/common/cloud'
import { assign } from '@/models/common'
import { fromText, prefixFiles, toConfig, unprefixFiles, type File, type Files } from '@/models/common/file'
import { SpxProject } from '@/models/spx/project'

import { Course, mainCourseFilePath } from './course'
import { DerivedFile } from './derived-file'
import { ensureValidVideoName, getVideoAssetPath, Video } from './video'

export const configFilePath = 'index.json'

export type TutorialProjectConfig = {
  /** The embedded learner project. */
  project: {
    type: 'spx'
    root: string
  }
  /** The route initially displayed in the editor. */
  inEditorPath: string
  /** Copilot instructions supplied by the course author. */
  copilotContext: string
}

export type TutorialProjectMetadata = Omit<PlaygroundCourse, 'content'>

export type TutorialProjectSerialized = {
  metadata: TutorialProjectMetadata
  files: Files
}

export { Video } from './video'
export { Course } from './course'

/**
 * A Tutorial project is a collection of records (path → file). Typed parts of the model claim the records they
 * understand: the config claims `index.json`, the course program claims `main_course.gox`, the embedded project
 * claims its root directory and each video package claims its directory. Records nobody claims are kept in
 * `extraFiles` and written back as they are, so a course produced by a newer format, or carrying files this
 * model does not understand, is never silently trimmed.
 */
export class TutorialProject {
  id = ''
  owner = ''
  kind = 'playground' as const
  title = ''
  thumbnail = ''

  /** Tutorial-project configuration. */
  config: TutorialProjectConfig | null = null
  /** The embedded learner project. */
  project: SpxProject
  /** The course author's main program. */
  mainCourse: Course
  /** Course-local video resources. */
  videos: Video[] = []
  /** Records claimed by no part of the model, keyed by path. */
  extraFiles: Files = {}

  private configFile = new DerivedFile((json) => fromText(configFilePath, json))

  constructor() {
    this.project = new SpxProject()
    this.mainCourse = new Course()
    return reactive(this) as this
  }

  static async load(course: PlaygroundCourse) {
    const project = new TutorialProject()
    await project.load({ metadata: course, files: getFiles(course.content) })
    return project
  }

  setMetadata(metadata: Partial<TutorialProjectMetadata>) {
    assign<TutorialProject>(this, metadata)
  }

  setConfig(config: Partial<TutorialProjectConfig>) {
    if (this.config == null) throw new Error('Tutorial project has not been loaded')
    this.config = { ...this.config, ...config }
  }

  async load({ metadata, files }: TutorialProjectSerialized) {
    this.setMetadata(metadata)
    await this.loadFiles(files)
  }

  async loadFiles(files: Files) {
    const configFile = files[configFilePath]
    if (configFile == null) throw new Error(`file ${configFilePath} not found`)
    const config = (await toConfig(configFile)) as TutorialProjectConfig
    await this.project.loadFiles(unprefixFiles(files, config.project.root))
    await this.mainCourse.loadFiles(files)
    const videos = await Video.loadAll(files)

    const extraFiles: Files = {}
    for (const [path, file] of Object.entries(files)) {
      if (file != null && !isClaimedPath(path, config, videos)) extraFiles[path] = file
    }

    this.config = config
    this.videos.splice(0).forEach((video) => video.setProject(null))
    videos.forEach((video) => this.addVideo(video))
    this.extraFiles = extraFiles
  }

  private prepareAddVideo(video: Video) {
    const name = ensureValidVideoName(video.name, this)
    video.setName(name)
    video.setProject(this)
  }

  addVideo(video: Video) {
    this.prepareAddVideo(video)
    this.videos.push(video)
  }

  removeVideo(id: string) {
    const index = this.videos.findIndex((video) => video.id === id)
    if (index < 0) throw new Error(`video ${id} not found`)
    const [video] = this.videos.splice(index, 1)
    video.setProject(null)
  }

  /** Whether `path` is claimed by a typed part of the model, so that it cannot hold an extra file. */
  isClaimedPath(path: string) {
    if (this.config == null) throw new Error('Tutorial project has not been loaded')
    return isClaimedPath(path, this.config, this.videos)
  }

  getExtraFile(path: string): File | null {
    return this.extraFiles[path] ?? null
  }

  setExtraFile(path: string, file: File) {
    if (this.isClaimedPath(path)) throw new Error(`path ${path} is claimed by the course model`)
    this.extraFiles[path] = file
  }

  removeExtraFile(path: string) {
    if (this.extraFiles[path] == null) throw new Error(`file ${path} not found`)
    delete this.extraFiles[path]
  }

  exportFiles() {
    if (this.config == null) throw new Error('Tutorial project has not been loaded')
    const files: Files = {}
    for (const [path, file] of Object.entries(this.extraFiles)) {
      if (file != null) files[path] = file
    }
    files[configFilePath] = this.configFile.get(JSON.stringify(this.config))
    Object.assign(
      files,
      prefixFiles(this.project.exportFiles(), this.config.project.root),
      this.mainCourse.export(),
      ...this.videos.map((video) => video.export())
    )
    return files
  }

  /**
   * Export after any in-flight transaction of the embedded project (undo/redo, imports) has finished,
   * so the result never captures an intermediate state. Use this for saving and previewing.
   */
  snapshot(): Promise<TutorialProjectSerialized> {
    return this.project.mutex.runExclusive(() => this.export())
  }

  export(): TutorialProjectSerialized {
    return {
      metadata: {
        id: this.id,
        owner: this.owner,
        kind: this.kind,
        title: this.title,
        thumbnail: this.thumbnail
      },
      files: this.exportFiles()
    }
  }
}

function isClaimedPath(path: string, config: TutorialProjectConfig, videos: Video[]) {
  if (path === configFilePath || path === mainCourseFilePath) return true
  if (path.startsWith(config.project.root + '/')) return true
  return videos.some((video) => path.startsWith(getVideoAssetPath(video.name) + '/'))
}
