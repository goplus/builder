import { markRaw } from 'vue'
import { resolve } from '@/utils/path'
import { Disposable } from '@/utils/disposable'

import { File, fromConfig, listAllFiles, toConfig, type Files } from './common/file'
import type { Size } from './common'
import { CollisionShapeType, type CollisionPivot, type CollisionShapeParams } from './sprite'

export type Coord = { x: number; y: number }

type TileInfo = {
  atlasCoords: Coord
  physics: { collisionPoints?: Coord[] }
}

type Layer = {
  id: number
  name: string
  zIndex: number
  tileData: number[]
}

type TilemapInits = {
  tileTextures: TileTextures
  tileSet: TileSet
  layers?: Layer[]
  tileSize?: Size
  format?: number
  decorators?: Decorator[]
  extraConfig?: object
}

export type RawTilemapConfig = {
  tilemap?: {
    format: number
    tile_size: Size
    tileset: {
      sources: RawTileSourceConfig[]
    }
    layers: RawLayerConfig[]
  }
  decorators?: RawDecoratorConfig[]
  sprites?: unknown[]
}

type RawDecoratorConfig = {
  name?: string
  parent?: string
  path?: string
  position?: Coord
  scale?: Coord
  rotation?: number
  pivot?: Coord
  z_index?: number // omitemptys
  collider_type?: CollisionShapeType
  collider_pivot?: CollisionPivot
  collider_points?: CollisionShapeParams
}

type RawTileInfoConfig = {
  atlas_coords?: Coord
  physics?: { collision_points?: Coord[] } // omitemptys
}

export type RawTileSourceConfig = {
  id?: number
  texture_path?: string
  tiles?: RawTileInfoConfig[]
}

type RawLayerConfig = {
  id?: number
  name?: string
  z_index?: number
  tile_data?: number[]
}

type RawTileSetConfig = {
  sources: RawTileSourceConfig[]
}

const tilemapsAssetsPathName = 'tilemaps'
const textureAssetPathName = 'textures'

class Texture {
  constructor(
    public file: File,
    public relativePath: string
  ) {}
}

class TileTextures {
  constructor(private textures: Record<string, Texture>) {}

  texture(name: string) {
    return this.textures[name]
  }

  static load(files: Files, dir: string) {
    const allFiles = listAllFiles(files, resolve(dir, textureAssetPathName))

    const textures: Record<string, Texture> = {}
    const dirWithSlash = dir + '/'
    allFiles
      .filter((filePath) => !filePath.endsWith('.import')) // TODO filter the extra `.import` files.
      .forEach((filePath) => {
        const texture = files[filePath]
        if (texture) {
          textures[filePath] = new Texture(texture, filePath.slice(dirWithSlash.length)) // like textures/xx/xx.png
        }
      })

    return new TileTextures(textures)
  }

  export(): Files {
    const files: Files = {}
    for (const fullPath of Object.keys(this.textures)) {
      const texture = this.textures[fullPath]
      files[fullPath] = texture.file
    }
    return files
  }
}

class TileSource {
  constructor(
    public id: number,
    public texture: Texture,
    public tiles: TileInfo[]
  ) {}

  static load(
    { id, texture_path, tiles: rawTiles = [] }: RawTileSourceConfig,
    dir: string,
    tileTextures: TileTextures
  ) {
    if (texture_path == null || id == null) return null

    const texture = tileTextures.texture(resolve(dir, texture_path))
    if (texture == null) return null

    const tiles = rawTiles.flatMap(({ atlas_coords, physics = {} }) =>
      atlas_coords != null
        ? {
            atlasCoords: atlas_coords,
            physics: { collisionPoints: physics.collision_points }
          }
        : []
    )
    return new TileSource(id, texture, tiles)
  }

  export(): RawTileSourceConfig {
    return {
      id: this.id,
      texture_path: this.texture.relativePath,
      tiles: this.tiles.map(({ atlasCoords, physics: { collisionPoints } }) => ({
        atlas_coords: atlasCoords,
        physics: { collision_points: collisionPoints }
      }))
    }
  }
}

class TileSet {
  constructor(public sources: TileSource[]) {}

  static load({ sources: rawSources }: RawTileSetConfig, dir: string, tileTextures: TileTextures) {
    const sources = rawSources.flatMap((source) => TileSource.load(source, dir, tileTextures) ?? [])
    return new TileSet(sources)
  }

  export(): RawTileSetConfig {
    return {
      sources: this.sources.map((source) => source.export())
    }
  }
}

export class Decorator {
  readonly img: File
  readonly position: Coord
  readonly scale: Coord
  readonly rotation: number
  readonly pivot: Coord

  constructor(img: File, config: Omit<RawDecoratorConfig, 'path'>) {
    this.img = img
    this.position = config.position ?? { x: 0, y: 0 }
    this.scale = config.scale ?? { x: 1, y: 1 }
    this.rotation = config.rotation ?? 0
    this.pivot = config.pivot ?? { x: 0, y: 0 }
  }

  static load({ path, ...config }: RawDecoratorConfig, dir: string, files: Files) {
    if (path == null) throw new Error('path expected for decorator')
    const imgFile = files[resolve(dir, path)]
    if (imgFile == null) throw new Error(`file ${path} for decorator ${config.name} not found`)
    return new Decorator(imgFile, config)
  }

  export(): RawDecoratorConfig {
    throw new Error('not implemented')
  }
}

export class Tilemap extends Disposable {
  format: number
  tileSize: Size
  tileTextures: TileTextures
  tileSet: TileSet
  layers: Layer[]
  decorators: Decorator[]
  extraConfig: object

  constructor(
    public tilemapPath: string,
    { tileTextures, tileSet, layers, decorators, format, tileSize, extraConfig }: TilemapInits
  ) {
    super()
    this.tileTextures = tileTextures
    this.tileSize = tileSize ?? { width: 16, height: 16 }
    this.format = format ?? 0
    this.layers = layers ?? []
    this.decorators = decorators ?? []
    this.extraConfig = extraConfig ?? {}
    this.tileSet = tileSet

    // For now we do not support reactive changes on tilemap.
    // Temporarily we mark it as raw to improve performance.
    markRaw(this)
  }

  static async load(rawTilemapPath: string, parentDir: string, files: Files): Promise<Tilemap | null> {
    const tilemapPath = resolve(parentDir, rawTilemapPath)
    const tilemapFile = files[tilemapPath]
    if (tilemapFile == null) {
      throw new Error(`tilemap file not found: ${tilemapPath}`)
    }
    const config: RawTilemapConfig = {}
    const { tilemap, decorators: rawDecorators = [], sprites = [] } = Object.assign(config, await toConfig(tilemapFile))

    if (tilemap == null) {
      console.error('"tilemap" is required')
      return null
    }
    const { layers: rawLayers = [], format, tile_size, tileset } = tilemap

    if (tile_size == null) {
      console.error('"tile_size" is required')
      return null
    }

    const currentDir = resolve(parentDir, tilemapsAssetsPathName)
    const tileTextures = TileTextures.load(files, currentDir)
    const tileSet = TileSet.load({ sources: tileset?.sources ?? [] }, currentDir, tileTextures)
    const decorators = rawDecorators.map((d) => Decorator.load(d, currentDir, files))
    const layers = rawLayers.flatMap(({ id, name = '', tile_data = [], z_index }) =>
      id != null ? { id, name, tileData: tile_data, zIndex: z_index ?? 0 } : []
    )

    return new Tilemap(rawTilemapPath, {
      format,
      tileSize: tile_size,
      tileTextures,
      tileSet,
      layers,
      decorators,
      extraConfig: { sprites }
    })
  }

  export(parentDir: string): Files {
    const tilemapPath = resolve(parentDir, this.tilemapPath)
    const { format, tileSize, tileSet, layers, decorators, tileTextures, extraConfig } = this
    const textures = tileTextures.export()
    const rawTileSet = tileSet.export()
    const rawTilemapConfig: RawTilemapConfig = {
      tilemap: {
        format,
        tile_size: tileSize,
        tileset: rawTileSet,
        layers: layers.map(({ id, name, tileData, zIndex }) => ({ id, name, tile_data: tileData, z_index: zIndex }))
      },
      decorators: decorators.map((decorator) => decorator.export()),
      ...extraConfig
    }

    return {
      [tilemapPath]: fromConfig(tilemapPath, rawTilemapConfig),
      ...textures
    }
  }
}

export class DumbTilemap extends Disposable {
  tilemapPath: string
  files: Files
  decorators: Decorator[] = []

  constructor(tilemapPath: string, files: Files, decorators: Decorator[]) {
    super()
    this.tilemapPath = tilemapPath
    this.files = files
    this.decorators = decorators
    markRaw(this)
  }

  static async load(rawTilemapPath: string, parentDir: string, files: Files): Promise<DumbTilemap | null> {
    const tilemapFiles: Files = {}
    const tilemapPath = resolve(parentDir, rawTilemapPath)
    const tilemapsAssetsPath = resolve(parentDir, tilemapsAssetsPathName)
    const tilemapFile = files[tilemapPath]
    if (tilemapFile == null) throw new Error(`tilemap file not found: ${tilemapPath}`)
    tilemapFiles[tilemapPath] = tilemapFile
    const others = listAllFiles(files, tilemapsAssetsPath).filter(
      (filePath) => !filePath.endsWith('.DS_Store') && !filePath.endsWith('.import')
    )
    for (const filePath of others) {
      tilemapFiles[filePath] = files[filePath]
    }
    const config = (await toConfig(tilemapFile)) as RawTilemapConfig
    const decorators = (config.decorators ?? []).map((d) => Decorator.load(d, tilemapsAssetsPath, files))
    return new DumbTilemap(rawTilemapPath, tilemapFiles, decorators)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export(parentDir: string): Files {
    return this.files
  }
}
