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
        this.list.push(...assets);
    }

    remove(name: string): T | null;
    remove(item: T): T | null;

    remove(item: string | T): T | null {
        const index = this.list.findIndex(i => typeof item === 'string' ? i.name === item : i === item);
        return index > -1 ? this.list.splice(index, 1)[0] : null;
    }
}

export class SpriteList extends AssetList<Sprite> {
  project: Project
  constructor(project: Project) {
    super()
    this.project = project
  }
  addSpriteToProject(sprite: Sprite): void {
    if (sprite) {
      this.add(sprite)
      this.project.backdrop.config.zorder.push(sprite.name)
    }
  }
  removeSpriteFromProject(sprite: Sprite): void {
    const index = this.project.backdrop.config.zorder.indexOf(sprite.name)
    if (index !== -1) {
      this.remove(sprite)
      this.project.backdrop.config.zorder.splice(index, 1)
    }
  }
}

export class SoundList extends AssetList<Sound> { }