import { AssetBase } from "./asset-base";
import { Sound } from "./sound";
import { Sprite } from "./sprite";
import type { Project } from "./project";
export abstract class AssetList<T extends AssetBase> {
    public list: T[] = [];

    constructor(list: T[] = []) {
        this.list = list;
    }

    add(...assets: T[]) {
        for (const asset of assets) {
            let counter = 1
            const name = asset.name
            while (this.list.find(item => item.name === asset.name)) {
                counter++
                asset.name = `${name}_${counter}`
            }
            this.list.push(asset)
        }
    }

    remove(name: string): T | null;
    remove(item: T): T | null;

    remove(item: string | T): T | null {
        const index = this.list.findIndex(i => typeof item === 'string' ? i.name === item : i === item);
        if (index === -1) return null
        const t = this.list.splice(index, 1)[0]
        return t
    }
}

export class SpriteList extends AssetList<Sprite> {
  project: Project

  constructor(project: Project) {
    super()
    this.project = project
  }
  add(...sprites: Sprite[]): void {
    super.add(...sprites)
    sprites.forEach((sprite) => {
      this.project.backdrop.config.zorder.push(sprite.name)
    })
  }
  remove(sprite: Sprite | string): Sprite | null {
    const removeSprite = typeof sprite === 'string' ? super.remove(sprite) : super.remove(sprite)
    if (removeSprite) {
      const index = this.project.backdrop.config.zorder.indexOf(removeSprite.name)
      if (index !== -1) {
        this.project.backdrop.config.zorder.splice(index, 1)
      }
    }
    return removeSprite
  }
}

export class SoundList extends AssetList<Sound> { }