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
import { removeProject as removeCloudProject } from '@/api/project'
import { AssetList, SoundList, SpriteList } from '@/class/asset-list'
import { Backdrop } from '@/class/backdrop'
import { getProject, getProjects, saveProject, updateProjectIsPublic } from '@/api/project'
import { Sprite } from './sprite'
import { Sound } from './sound'
import type { Config } from '@/interface/file'
import FileWithUrl from '@/class/file-with-url'
import defaultSceneImage from '@/assets/image/default_scene.png'
import defaultSpriteImage from '@/assets/image/default_sprite.png'
import type { AssetBase } from './asset-base'

export enum ProjectSource {
  local = 'local',
  cloud = 'cloud'
}

export enum PublicStatus {
  private = 0,
  public = 1
}

export interface ProjectSummary {
  // Temporary id when not uploaded to cloud, replace with real id after uploaded
  id: string
  // Project name
  name: string
  // version number
  version: number
  // Project source
  source: ProjectSource
  // create time
  cTime: string
  // update time
  uTime: string
  // public status
  isPublic?: PublicStatus
  // author
  authorId?: string
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
  version: number
  source: ProjectSource
  name: string
  sprite: SpriteList
  sound: SoundList
  backdrop: Backdrop
  unidentifiedFile: RawDir
  entryCode: string
  cTime: string
  uTime: string

  /** Cloud Id */
  _id: string | null = null
  /** Temporary id when not uploaded to cloud */
  _temporaryId: string | null = null

  /** Project id */
  get id() {
    return (this._id || this._temporaryId)!
  }

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
    str += `run "assets", {Title: "${this.name}"}\n`
    return str
  }

  static ENTRY_FILE_NAME = 'index.gmx'

  static TEMPORARY_ID_PREFIX = 'temp__'

  static ALL_USER = '*'

  static fromRawData(data: ProjectDetail & ProjectSummary): Project {
    const project = new Project()
    Object.assign(project, data)
    return project
  }

  static async getLocalProjects(): Promise<ProjectSummary[]> {
    const paths = await fs.readdir('summary/')
    const projects: ProjectSummary[] = []
    for (const path of paths) {
      const content = await fs.readFile(path) as ProjectSummary
      projects.push(content)
    }
    return projects.map((project) => ({ ...project, source: ProjectSource.local }))
  }

  static async getCloudProjects(author?: string, isPublic?: PublicStatus, pageIndex: number = 1, pageSize: number = 300): Promise<ProjectSummary[]> {
    const res = await getProjects(pageIndex, pageSize, isPublic, author)
    const projects = res.data || []
    return projects.map((project) => ({ ...project, source: ProjectSource.cloud }))
  }

  static updateProjectIsPublic(id: string, status: PublicStatus): Promise<string> {
    return updateProjectIsPublic(id, status)
  }

  static async removeLocalProject(id: string) {
    await fs.rmdir(id)
    await fs.unlink("summary/" + id)
  }
  
  static async removeProject(id: string, source: ProjectSource = ProjectSource.cloud) {
    if (source === ProjectSource.local) {
      await Project.removeLocalProject(id)
    } else {
      await removeCloudProject(id)
    }
  }

  constructor() {
    this.name = ''
    this.sound = new SoundList()
    this.backdrop = new Backdrop()
    this.sprite = new SpriteList(this)
    this.sound = new SoundList()
    this.entryCode = ''
    this.unidentifiedFile = {}
    this._temporaryId = Project.TEMPORARY_ID_PREFIX + nanoid()
    this.version = 1
    this.source = ProjectSource.local
    this.cTime = new Date().toISOString()
    this.uTime = this.cTime
  }

  async load(id: string, source: ProjectSource = ProjectSource.cloud,userId?:string): Promise<void> {
    this.source = source
    if (source === ProjectSource.local) {
      if (id.startsWith(Project.TEMPORARY_ID_PREFIX)) {
        this._temporaryId = id
      } else {
        this._id = id
      }
      const paths = (await fs.readdir(id)) as string[]
      if (!paths.length) {
        throw new Error('Project not found')
      }

      const dirPath: DirPath = {}
      for (const path of paths) {
        dirPath[path] = await fs.readFile(path)
      }
      this._load(dirPath)

      const summary = await fs.readFile("summary/" + id) as ProjectSummary
      this.name = summary.name
      this.version = summary.version
      this.cTime = summary.cTime || this.cTime
      this.uTime = summary.uTime || this.uTime
    } else {
      const { address, name, version, cTime, uTime, authorId } = await getProject(id)
      if (userId && userId === authorId) {
        this._id = id
      }
      this.version = version
      this.cTime = cTime
      this.uTime = uTime
      const zip = await fetch(address).then(res => res.blob())
      const zipFile = new File([zip], name)
      await this.loadFromZip(zipFile)
    }
  }

  /**
   * Load project from directory.
   * @param dir The directory
   */
  _load(dir: DirPath): void {
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

    function findOrCreateItem<T extends AssetBase>(name: string, collection: AssetList<T>, constructor: new (name: string) => T) {
      let item = collection.list.find(item => item.name === name);
      if (!item) {
        item = new constructor(name);
        collection.add(item);
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
        const sprite: Sprite = findOrCreateItem<Sprite>(spriteName, this.sprite, Sprite);
        handleFile(file, filename, sprite);
      }
      else if (/^(main|index)\.(spx|gmx)$/.test(path)) {
        this.entryCode = content as string
      }
      else if (/^.+\.spx$/.test(path)) {
        const spriteName = path.match(/^(.+)\.spx$/)?.[1] || '';
        const sprite: Sprite = findOrCreateItem<Sprite>(spriteName, this.sprite, Sprite);
        sprite.code = content as string;
      }
      else if (Sound.REG_EXP.test(path)) {
        const soundName = path.match(Sound.REG_EXP)?.[1] || '';
        const sound: Sound = findOrCreateItem<Sound>(soundName, this.sound, Sound);
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

  async loadFromZip(file: File, name?: string) {
    const dirPath = await getDirPathFromZip(file)
    this._load(dirPath)
    this.name = name || file.name.split('.')[0] || this.name
  }

  async loadBlankProject() {
    this.name = 'Untitled'
    const sceneBlob = await (await fetch(defaultSceneImage)).blob()
    const spriteBlob = await (await fetch(defaultSpriteImage)).blob()
    const sceneFile = new File([sceneBlob], 'default_scene.png', { type: sceneBlob.type })
    const spriteFile = new File([spriteBlob], 'default_sprite.png', { type: spriteBlob.type })
    this.backdrop.addScene([
      { name: 'default_scene', file: new FileWithUrl(sceneFile, URL.createObjectURL(sceneFile)) }
    ])
    const defaultSprite = new Sprite('default_sprite', [spriteFile])
    defaultSprite.config.size = 1
    // The size of the costume is 110 * 100, so setting the center point of the image to half of its height and width
    // can make the costume of sprite render at the center point of the stage.
    defaultSprite.config.costumes[0].x=55
    defaultSprite.config.costumes[0].y=50
    this.sprite.add(defaultSprite)
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
      name: this.name,
      version: this.version,
      source: this.source,
      cTime: this.cTime,
      uTime: new Date().toISOString(),
    }
    await fs.writeFile(this.summaryPath, summary)
  }

  /**
   * Remove project from storage.
   */
  async removeLocal() {
    if (this._temporaryId !== null) {
      await Project.removeLocalProject(this._temporaryId)
    }
    if (this._id !== null) {
      await Project.removeLocalProject(this._id)
    }
  }

  /**
   * Save project to Cloud.
   */
  async save() {
    if (!this.name.trim()){
      throw new Error('Project name cannot be empty!')
    }
    const id = this._id ?? void 0
    return saveProject(this.name, await this.zip, id).then(async res => {
      this._id = res.id
      this.version = res.version
      this.cTime = res.cTime
      this.uTime = res.uTime
      return Promise.resolve("Save success!")
    })
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
      return new File([blob], `${this.name}.zip`, { type: blob.type })
    })()
  }
}