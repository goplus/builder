import { computed, reactive, toValue, type ComputedRef } from 'vue'
import { isEqual } from 'lodash'

import { Disposable } from '@/utils/disposable'
import Mutex from '@/utils/mutex'
import type { PlaygroundCourse } from '@/apis/course'
import { getFiles } from '@/models/common/cloud'
import { assign } from '@/models/common'
import { fromConfig, prefixFiles, toConfig, unprefixFiles, type File, type Files } from '@/models/common/file'
import { SpxProject } from '@/models/spx/project'

import { ensureValidImageName, ensureValidVideoName } from './asset-name'
import { Course } from './course'
import { Image } from './image'
import { Video } from './video'

export const configFilePath = 'index.json'

export type TutorialProjectConfig = {
  /** The embedded learner project. */
  project: {
    /** Selects the editor the learner gets; `spx` is the only one so far. */
    type: 'spx'
    /** Directory holding the embedded project's files, without trailing slash. */
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
export { Image } from './image'
export { Course } from './course'

export class TutorialProject extends Disposable {
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
  /** Course-local image resources. */
  images: Image[] = []

  /**
   * Mutex for transaction operations on the course.
   * Use this to ensure transactional operations atomicity.
   */
  mutex = new Mutex()

  // Kept as the same `File` while the config is unchanged, so that exports can be compared by identity.
  private configFile: ComputedRef<File | null>

  constructor() {
    super()
    this.project = new SpxProject()
    this.addDisposable(this.project)
    this.mainCourse = new Course()
    const reactiveThis = reactive(this) as this
    this.configFile = computed(() =>
      reactiveThis.config == null ? null : fromConfig(configFilePath, reactiveThis.config)
    )
    return reactiveThis
  }

  static async load(course: PlaygroundCourse) {
    const project = new TutorialProject()
    try {
      await project.load({ metadata: course, files: getFiles(course.content) })
    } catch (error) {
      // The caller never gets this instance, so nobody else can release it.
      project.dispose()
      throw error
    }
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
    // What did not change is kept as it is, so its files keep their identity: undoing an edit of one part must not
    // look like a change of the others (exports are compared by identity to find unsaved changes), nor reload the
    // embedded project for nothing.
    const projectFiles = unprefixFiles(files, config.project.root)
    if (!isSameFiles(projectFiles, this.project.exportFiles())) await this.project.loadFiles(projectFiles)
    await this.mainCourse.loadFiles(files)
    const videos = await Video.loadAll(files)
    const images = await Image.loadAll(files)

    if (!isEqual(config, this.config)) this.config = config
    const oldVideos = this.videos.splice(0)
    oldVideos.forEach((video) => video.setProject(null))
    keepExisting(videos, oldVideos).forEach((video) => this.addVideo(video))
    const oldImages = this.images.splice(0)
    oldImages.forEach((image) => image.setProject(null))
    keepExisting(images, oldImages).forEach((image) => this.addImage(image))
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

  private prepareAddImage(image: Image) {
    const name = ensureValidImageName(image.name, this)
    image.setName(name)
    image.setProject(this)
  }

  addImage(image: Image) {
    this.prepareAddImage(image)
    this.images.push(image)
  }

  removeImage(id: string) {
    const index = this.images.findIndex((image) => image.id === id)
    if (index < 0) throw new Error(`image ${id} not found`)
    const [image] = this.images.splice(index, 1)
    image.setProject(null)
  }

  /**
   * Export the files of the course. Only what the model holds is exported: other files the course was loaded
   * with are not kept.
   *
   * NOTE: this method may return intermediate result during transactional edits.
   */
  exportFiles(): Files {
    const configFile = toValue(this.configFile)
    if (this.config == null || configFile == null) throw new Error('Tutorial project has not been loaded')
    return Object.assign(
      { [configFilePath]: configFile },
      prefixFiles(this.project.exportFiles(), this.config.project.root),
      this.mainCourse.export(),
      ...this.videos.map((video) => video.export()),
      ...this.images.map((image) => image.export())
    )
  }

  /** Run `job` after transactions of the course and of the embedded project finished, holding off new ones. */
  runExclusive<T>(job: () => T | Promise<T>): Promise<T> {
    return this.mutex.runExclusive(() => this.project.mutex.runExclusive(job))
  }

  /** Export metadata & files, after transactional edits of the course and of the embedded project finished. */
  async export(): Promise<TutorialProjectSerialized> {
    return this.runExclusive(() => ({
      metadata: {
        id: this.id,
        owner: this.owner,
        kind: this.kind,
        title: this.title,
        thumbnail: this.thumbnail
      },
      files: this.exportFiles()
    }))
  }
}

/** `loaded`, with each item that `existing` already has (by id) replaced by that one, updated to match. */
function keepExisting<T extends Video | Image>(loaded: T[], existing: T[]) {
  const left = [...existing]
  return loaded.map((item) => {
    const index = left.findIndex((e) => e.id === item.id)
    if (index < 0) return item
    const [kept] = left.splice(index, 1)
    kept.setName(item.name)
    kept.setFile(item.file)
    return kept
  })
}

function isSameFiles(a: Files, b: Files) {
  const paths = Object.keys(a)
  return paths.length === Object.keys(b).length && paths.every((path) => a[path] === b[path])
}
