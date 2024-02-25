import type { DirPath, RawDir } from '@/types/file'
import * as fs from '@/util/file-system'
import { nanoid } from 'nanoid'
import {
  convertDirPathToProject,
  convertRawDirToDirPath,
  convertRawDirToZip,
  getDirPathFromZip,
  getMimeFromExt,
  getPrefix
} from '@/util/file'
import saveAs from 'file-saver'
import { SoundList, SpriteList } from '@/class/asset-list'
import { Backdrop } from '@/class/backdrop'
import { uploadFile, getProjectList, saveProject, loadProject } from '@/api/project'
import type { ProjectFiles } from '@/interface/library'
import { useUserStore } from '@/store'
import { computed } from 'vue'

export enum ProjectSource {
  local,
  cloud
}

interface ProjectSummary {
  // Temporary id when not uploaded to cloud, replace with real id after uploaded
  id: string
  // Project name
  name: string
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

const uid = computed(() => useUserStore().userInfo?.id || '')

export class Project implements ProjectDetail, ProjectSummary {
  id: string
  version: number
  source: ProjectSource
  name: string
  sprite: SpriteList
  sound: SoundList
  backdrop: Backdrop
  entryCode: string
  unidentifiedFile: RawDir

  entryCodeUrl: string = ""

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static ENTRY_FILE_NAME = 'index.gmx'

  static fromRawData(data: ProjectDetail & ProjectSummary): Project {
    const project = new Project()
    Object.assign(project, data)
    return project
  }

  private static async getLocalProjects(): Promise<ProjectSummary[]> {
    const paths = await fs.getWithPrefix('summary/')
    const projects: ProjectSummary[] = []
    for (const path of paths) {
      const content = await fs.get(path) as ProjectSummary
      projects.push(content)
    }
    return projects
  }

  private static async getCloudProjects(): Promise<ProjectSummary[]> {
    const paths = await getProjectList(uid.value)
    return paths.map(data => ({ ...data, source: ProjectSource.cloud })) || []
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
    this.name = ''
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
    await this.setId(id)
    this.source = source
    const dirPath: DirPath = {}
    if (source === ProjectSource.local) {
      const paths = await fs.getWithPrefix(id)
      for (const path of paths) {
        const content = await fs.get(path)
        dirPath[path] = content
      }
      const summary = await fs.get("summary/" + id) as ProjectSummary
      Object.assign(this, summary)
    } else {
      const project = await loadProject(this.id)
      const dirPath: DirPath = {}
      for (const [path, url] of Object.entries(project.files)) {
        const content = await fetch(url).then(res => res.arrayBuffer())
        dirPath[path] = {
          content,
          url,
          modifyTime: new Date(project.updatedAt),
          size: content.byteLength,
          path: this.path + path,
          type: getMimeFromExt(path.split('.').pop()!)
        }
      }
      Object.assign(this, project)
    }
    this._load(dirPath)
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
      this.name = arg.name
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

  async loadFromZip(file: File, name?: string) {
    const dirPath = await getDirPathFromZip(file)
    this._load(dirPath)
    this.name = name || file.name.split('.')[0] || this.name
  }

  /**
   * Save project to storage.
   */
  async saveLocal() {
    const dirPath = await this.dirPath
    for (const [key, value] of Object.entries(dirPath)) {
      await fs.set(key, value)
    }
    const summary: ProjectSummary = {
      id: this.id,
      name: this.name,
      version: this.version,
      source: this.source
    }
    fs.set(this.summaryPath, summary)
  }

  /**
   * Remove project from storage.
   */
  async removeLocal() {
    await fs.removeWithPrefix(this.path)
    await fs.remove(this.summaryPath)
  }

  /**
   * Save project to Cloud.
   */
  async save(isPublic: number = 0) {
    const files = await this.uploadFile()
    const project = await saveProject({
      name: this.name,
      uid: uid.value,
      isPublic,
      files
    })
    await this.setId(project.id)
    return project
  }

  /**
   * Upload files to server if file is not exist.
   * @returns The path of the project
   */
  private async uploadFile() {
    const dir = await this.dirPath
    const prefix = getPrefix(dir)
    const files: ProjectFiles = {}
    for (const [key, value] of Object.entries(dir)) {
      const k = key.replace(prefix, '')
      files[k] = value.url ? value.url : await uploadFile(new File([value.content], k)) as string
    }
    return files
  }

  /**
   * Download project to computer.
   */
  async download() {
    const content = await this.zip
    saveAs(content, `${this.name}.zip`)
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
    files[Project.ENTRY_FILE_NAME] = { url: this.entryCodeUrl, content: this.entryCode }
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
      return new File([blob], `${this.name}.zip`, { type: blob.type })
    })()
  }
}
