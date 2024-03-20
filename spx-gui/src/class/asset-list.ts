import { AssetBase } from './asset-base'
import { Sound } from './sound'
import { Sprite } from './sprite'
import type { Project } from './project'
import { checkUpdatedName } from '@/util/asset'
import { reactive } from 'vue'

export abstract class AssetList<T extends AssetBase> {
  public list: T[] = []
  project: Project

  constructor(project: Project, list: T[] = []) {
    this.project = project
    this.list = list
  }

  add(...assets: T[]) {
    for (const asset of assets) {
      try {
        const checkInfo = checkUpdatedName(asset.name, this.project)
        asset.name = checkInfo.name
        this.list.push(asset)
      } catch (e) {
        console.error(e)
      }
    }
  }

  remove(name: string): T | null
  remove(item: T): T | null

  remove(item: string | T): T | null {
    const index = this.list.findIndex((i) =>
      typeof item === 'string' ? i.name === item : i === item
    )
    return index > -1 ? this.list.splice(index, 1)[0] : null
  }
}

export class SpriteList extends AssetList<Sprite> {
  constructor(project: Project, list: Sprite[] = []) {
    super(project, list)
    return reactive(this)
  }

  add(...sprites: Sprite[]): void {
    super.add(...sprites)
    sprites.forEach((sprite) => {
      if (!this.project.backdrop.config.zorder.includes(sprite.name))
        this.project.backdrop.config.zorder.push(sprite.name)
    })
  }

  remove(sprite: Sprite | string): Sprite | null {
    const removeSprite = typeof sprite === 'string' ? super.remove(sprite) : super.remove(sprite)
    if (removeSprite) {
      this.project.backdrop.config.zorder = this.project.backdrop.config.zorder.filter(
        (name) => name !== removeSprite.name
      )
    }
    return removeSprite
  }
}

export class SoundList extends AssetList<Sound> {
  constructor(project: Project, list: Sound[] = []) {
    super(project, list)
    return reactive(this)
  }
}
