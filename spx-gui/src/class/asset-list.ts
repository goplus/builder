import { AssetBase } from "./asset-base";
import { Sound } from "./sound";
import { Sprite } from "./sprite";

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

export class SpriteList extends AssetList<Sprite> { }

export class SoundList extends AssetList<Sound> { }