import { reactive } from 'vue'

import type { PlaygroundCourse } from '@/apis/course'
import { getFiles } from '@/models/common/cloud'
import { assign } from '@/models/common'
import { fromConfig, prefixFiles, toConfig, unprefixFiles, type Files } from '@/models/common/file'
import { SpxProject } from '@/models/spx/project'

import { Course } from './course'
import { ensureValidVideoName, Video } from './video'

const configFilePath = 'index.json'

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

    this.config = config
    this.videos.splice(0).forEach((video) => video.setProject(null))
    videos.forEach((video) => this.addVideo(video))
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

  exportFiles() {
    if (this.config == null) throw new Error('Tutorial project has not been loaded')
    const files: Files = {}
    files[configFilePath] = fromConfig(configFilePath, this.config)
    Object.assign(
      files,
      prefixFiles(this.project.exportFiles(), this.config.project.root),
      this.mainCourse.export(),
      ...this.videos.map((video) => video.export())
    )
    return files
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
