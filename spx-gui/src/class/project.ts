import type { DirPath, RawDir } from '@/types/file'
import * as fs from '@/util/file-system'
import { nanoid } from 'nanoid'
import {
  convertDirPathToProject,
  convertRawDirToDirPath,
  convertRawDirToZip,
  getDirPathFromZip
} from '@/util/file'
import saveAs from 'file-saver'
import { SoundList, SpriteList } from '@/class/asset-list'
import { Backdrop } from '@/class/backdrop'

export enum ProjectSource {
  local,
  cloud
}

interface ProjectSummary {
  // Temporary id when not uploaded to cloud, replace with real id after uploaded
  id: string
  // Project title
  title: string
  // version number
  version: number
  // Project source
  source: ProjectSource
}

interface ProjectDetail {
  // Sprite list
  sprite: SpriteList
  // Sound list
  sound: SoundList
  // Backdrop
  backdrop: Backdrop
  // Entry code of the project
  entryCode: string
  // Documents not identified
  unidentifiedFile: RawDir
}

export class Project implements ProjectDetail, ProjectSummary {
  id: string
  version: number
  source: ProjectSource
  title: string
  sprite: SpriteList
  sound: SoundList
  backdrop: Backdrop
  entryCode: string
  unidentifiedFile: RawDir

  static ENTRY_FILE_NAME = 'index.gmx'

  static fromRawData(data: ProjectDetail & ProjectSummary): Project {
    const project = new Project()
    Object.assign(project, data)
    return project
  }

  private static async getLocalProjects(): Promise<ProjectSummary[]> {
    const paths = await fs.readdir('summary/')
    const projects: ProjectSummary[] = []
    for (const path of paths) {
      const content = await fs.readFile(path) as ProjectSummary
      projects.push(content)
    }
    return projects
  }

  private static async getCloudProjects(): Promise<ProjectSummary[]> {
    // TODO
    return []
  }

  /**
   * Get the list of projects.
   * @returns The list of local projects' summary
   */
  static async getProjects(): Promise<ProjectSummary[]> {
    const localProjects = await Project.getLocalProjects()
    const cloudProjects = await Project.getCloudProjects()

    const mergedProjects = localProjects
    for (const cloudProject of cloudProjects) {
      const local = mergedProjects.find((project) => project.id === cloudProject.id)
      if (!local || local.version !== cloudProject.version) {
        mergedProjects.push(cloudProject)
      }
    }

    return mergedProjects
  }

  constructor() {
    this.title = ''
    this.sprite = new SpriteList()
    this.sound = new SoundList()
    this.backdrop = new Backdrop()
    this.entryCode = ''
    this.unidentifiedFile = {}
    this.id = nanoid()
    this.version = 1
    this.source = ProjectSource.local
  }

  async load(id: string, source: ProjectSource = ProjectSource.cloud): Promise<void> {
    this.id = id
    this.source = source
    if (source === ProjectSource.local) {
      const paths = (await fs.readdir(id)) as string[]
      const dirPath: DirPath = {}
      for (const path of paths) {
        const content = await fs.readFile(path)
        dirPath[path] = content
      }
      this._load(dirPath)

      const summary = await fs.readFile("summary/" + id) as ProjectSummary
      Object.assign(this, summary)
    } else {
      // TODO: load from cloud
    }
  }

  /**
   * Load project from directory.
   * @param DirPath The directory
   */
  private _load(dirPath: DirPath): void

  /**
   * Load project.
   * @param proj The project
   */
  private _load(proj: Project): void

  private _load(arg: DirPath | Project): void {
    if (typeof arg === 'object' && arg instanceof Project) {
      this.id = arg.id
      this.version = arg.version
      this.source = arg.source
      this.title = arg.title
      this.sprite = arg.sprite
      this.sound = arg.sound
      this.backdrop = arg.backdrop
      this.entryCode = arg.entryCode
      this.unidentifiedFile = arg.unidentifiedFile
    } else {
      const proj = convertDirPathToProject(arg)
      this._load(proj)
    }
  }

  async loadFromZip(file: File, title?: string) {
    const dirPath = await getDirPathFromZip(file)
    this._load(dirPath)
    this.title = title || file.name.split('.')[0] || this.title
  }

  /**
   * Save project to storage.
   */
  async saveLocal() {
    const dirPath = await this.dirPath
    for (const [key, value] of Object.entries(dirPath)) {
      await fs.writeFile(key, value)
    }
    const summary: ProjectSummary = {
      id: this.id,
      title: this.title,
      version: this.version,
      source: this.source
    }
    fs.writeFile(this.summaryPath, summary)
  }

  /**
   * Remove project from storage.
   */
  async removeLocal() {
    await fs.rmdir(this.path)
    await fs.unlink(this.summaryPath)
  }

  /**
   * Save project to Cloud.
   */
  async save() {
    // TODO: save to cloud
  }

  /**
   * Download project to computer.
   */
  async download() {
    const content = await this.zip
    saveAs(content, `${this.title}.zip`)
  }

  run() {
    window.project_path = this.id
  }

  async setId(id: string) {
    await this.removeLocal()
    this.id = id
    await this.saveLocal()
  }

  get path() {
    return this.id + '/'
  }

  get summaryPath() {
    return 'summary/' + this.id
  }

  get rawDir() {
    const dir: RawDir = {}
    const files: RawDir = Object.assign(
      {},
      this.unidentifiedFile,
      ...[this.backdrop, ...this.sprite.list, ...this.sound.list].map((item) => item.dir)
    )
    files[Project.ENTRY_FILE_NAME] = this.entryCode
    for (const [path, value] of Object.entries(files)) {
      const fullPath = this.path + path
      dir[fullPath] = value
    }
    return dir
  }

  get dirPath(): Promise<DirPath> {
    return convertRawDirToDirPath(this.rawDir)
  }

  get zip(): Promise<File> {
    return (async () => {
      const blob = await convertRawDirToZip(this.rawDir)
      return new File([blob], `${this.title}.zip`, { type: blob.type })
    })()
  }
}
