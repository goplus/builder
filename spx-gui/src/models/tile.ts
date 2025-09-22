/* eslint-disable @typescript-eslint/no-unused-vars */
import { join } from '@/utils/path'
import { Disposable } from '@/utils/disposable'

import { File, listAllFiles, type Files } from './common/file'
import type { Sprite } from './sprite'

type Coord = { x: number; y: number }
type Size = { width: number; height: number }

type RawSpriteConfig = {
  name: string
  parent: string
  position: Coord
  path: string
}

type RawTileConfig = {
  tilemap: {
    tileSize: Size
    tileset: {
      sources: RawTileSourceConfig[]
    }
    format: number
    layers: RawLayerConfig[]
  }
  decorators: any[]
  sprites: RawSpriteConfig[]
}

const tileAssetPath = 'assets/tilemaps'
const textureAssetPath = 'textures'

class TileTextures {
  constructor(private textures: Files) {}

  texture(name: string) {
    return this.textures[name]
  }

  static load(files: Files) {
    const textures = listAllFiles(
      files,
      join(tileAssetPath, textureAssetPath),
      (filePath) => !filePath.endsWith('.import') // TODO
    )

    return new TileTextures(textures)
  }

  export() {
    return this.textures
  }
}

type RawTileSourceTileConfig = {
  atlas_coords: Coord
  physics: { collision_points?: Coord[] }
}

type RawTileSourceConfig = {
  id: number
  texture_path: string
  tiles: RawTileSourceTileConfig[]
}

type TileSourceTile = {
  atlasCoords: Coord
  physics: { collisionPoints?: Coord[] }
}

class TileSource {
  constructor(
    public id: number,
    public texture: File,
    public tiles: TileSourceTile[]
  ) {}

  static load({ id, texture_path, tiles: rawTiles }: RawTileSourceConfig, tileTextures: TileTextures) {
    const texture = tileTextures.texture(texture_path)
    if (!texture) return null

    const tiles = rawTiles.map(({ atlas_coords, physics }) => ({
      atlasCoords: atlas_coords,
      physics: { collisionPoints: physics.collision_points }
    }))
    return new TileSource(id, texture, tiles)
  }

  export() {}
}

type RawTileSetConfig = {
  sources: RawTileSourceConfig[]
}

class TileSet {
  constructor(public sources: TileSource[]) {}

  static load({ sources: rawSources }: RawTileSetConfig, tileTextures: TileTextures) {
    const sources = rawSources.flatMap((source) => TileSource.load(source, tileTextures) ?? [])
    return new TileSet(sources)
  }
}

type RawLayerConfig = {
  id: number
  name: string
  tile_Data: number[]
}

type Layer = {
  id: number
  name: string
  tileData: number[]
}

type TileInits = {
  tileTextures?: TileTextures
  layers?: Layer[]
  size?: Size
  tileset?: TileSet
  format?: number
  decorators?: any[]
}

export class Tile extends Disposable {
  layers: Layer[]
  tileTextures: TileTextures
  decorators: any[]

  constructor(
    public name: string,
    { tileTextures, layers, decorators }: TileInits = {}
  ) {
    super()
    this.tileTextures = tileTextures ?? new TileTextures({})
    this.layers = layers ?? []
    this.decorators = decorators ?? []
  }

  static async load(tilemapPath: string, files: Files, sprites: Sprite[]): Promise<Tile | null> {
    let tile: Tile | null = null
    if (!tileAssetPath.startsWith(tilemapPath)) {
      console.error(`Invalid tilemap path: ${tilemapPath}`)
      return tile
    }
    const tileTextures = TileTextures.load(files)

    tile = new Tile(tilemapPath, { tileTextures })
    return tile
  }

  export() {}
}
