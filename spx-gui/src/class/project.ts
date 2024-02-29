import type { DirPath, FileType, RawDir } from '@/types/file'
import * as fs from '@/util/file-system'
import { nanoid } from 'nanoid'
import {
  arrayBuffer2Content,
  convertRawDirToDirPath,
  convertRawDirToZip,
  getDirPathFromZip,
  getPrefix
} from '@/util/file'
import saveAs from 'file-saver'
import { SoundList, SpriteList } from '@/class/asset-list'
import { Backdrop } from '@/class/backdrop'
import { Sprite } from './sprite'
import { Sound } from './sound'
import type { Config } from '@/interface/file'

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
  unidentifiedFile: RawDir
  entryCode: string

  get defaultEntryCode() {
    let str = ""
    str += "var (\n"
    for (const sprite of this.sprite.list) {
      str += `\t${sprite.name} ${sprite.name}\n`
    }
    for (const sound of this.sound.list) {
      str += `\t${sound.name} Sound\n`
    }
    str += ")\n"
    str += `run "assets", {Title: "${this.title}"}\n`
    return str
  }

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
  private _load(dir: DirPath): void {
    const handleFile = (file: FileType, filename: string, item: any) => {
      switch (file.type) {
        case 'application/json':
          item.config = arrayBuffer2Content(file.content, file.type) as Config;
          break;
        default:
          item.files.push(arrayBuffer2Content(file.content, file.type, filename) as File);
          break;
      }
    }

    const findOrCreateItem = (name: string, collection: any[], constructor: typeof Sprite | typeof Sound) => {
      let item = collection.find(item => item.name === name);
      if (!item) {
        item = new constructor(name);
        collection.push(item);
      }
      return item;
    }

    const prefix = getPrefix(dir)

    // eslint-disable-next-line prefer-const
    for (let [path, file] of Object.entries(dir)) {
      const filename = file.path.split('/').pop()!;
      const content = arrayBuffer2Content(file.content, file.type, filename)
      path = path.replace(prefix, '')
      if (Sprite.REG_EXP.test(path)) {
        const spriteName = path.match(Sprite.REG_EXP)?.[1] || '';
        const sprite: Sprite = findOrCreateItem(spriteName, this.sprite.list, Sprite);
        handleFile(file, filename, sprite);
      }
      else if (/^(main|index)\.(spx|gmx)$/.test(path)) {
        this.entryCode = content as string
      }
      else if (/^.+\.spx$/.test(path)) {
        const spriteName = path.match(/^(.+)\.spx$/)?.[1] || '';
        const sprite: Sprite = findOrCreateItem(spriteName, this.sprite.list, Sprite);
        sprite.code = content as string;
      }
      else if (Sound.REG_EXP.test(path)) {
        const soundName = path.match(Sound.REG_EXP)?.[1] || '';
        const sound: Sound = findOrCreateItem(soundName, this.sound.list, Sound);
        handleFile(file, filename, sound);
      }
      else if (Backdrop.REG_EXP.test(path)) {
        handleFile(file, filename, this.backdrop);
      }
      else {
        this.unidentifiedFile[path] = content
      }
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
    files[Project.ENTRY_FILE_NAME] = this.entryCode || this.defaultEntryCode
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
