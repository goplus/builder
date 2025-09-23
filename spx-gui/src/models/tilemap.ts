import { join } from '@/utils/path'
import { Disposable } from '@/utils/disposable'

import { File, listAllFiles, type Files } from './common/file'

export type Coord = { x: number; y: number }
export type Size = { width: number; height: number }

type TileInfo = {
  atlasCoords: Coord
  physics: { collisionPoints?: Coord[] }
}

type Layer = {
  id: number
  name: string
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
  sprites?: any
}

type RawDecoratorConfig = {
  name?: string
  parent?: string
  position?: Coord
  texture_path?: string
  z_index?: number // omitemptys
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
  tile_data?: number[]
}

type RawTileSetConfig = {
  sources: RawTileSourceConfig[]
}

const tileAssetPath = 'tilemaps'
const textureAssetPath = 'textures'

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
    const allTextureFiles = listAllFiles(
      files,
      join(dir, textureAssetPath),
      (filePath) => !filePath.endsWith('.import') // TODO
    )

    const textures: Record<string, Texture> = {}
    const dirWithSlash = dir + '/'
    for (const fullPath of Object.keys(allTextureFiles)) {
      const texture = allTextureFiles[fullPath]
      if (texture) {
        textures[fullPath] = new Texture(texture, fullPath.slice(dirWithSlash.length)) // like textures/xx/xx.png
      }
    }

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

    const texture = tileTextures.texture(join(dir, texture_path))
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
      tiles: this.tiles.map(({ atlasCoords, physics: { collisionPoints } }) => {
        const physics = {}
        if (collisionPoints) {
          Object.assign(physics, { collision_points: collisionPoints })
        }
        return {
          atlas_coords: atlasCoords,
          physics
        }
      })
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

class Decorator {
  constructor(
    public name: string,
    public position: Coord,
    public texture: Texture,
    public zIndex?: number,
    public parent?: string
  ) {}

  static load(
    { name, parent, position, texture_path, z_index }: RawDecoratorConfig,
    dir: string,
    tileTextures: TileTextures
  ) {
    if (texture_path == null || name == null || position == null) return null

    const texture = tileTextures.texture(join(dir, texture_path))
    if (texture == null) return null

    return new Decorator(name, position, texture, z_index, parent)
  }

  export(): RawDecoratorConfig {
    return Object.assign(
      {
        name: this.name,
        position: this.position,
        texture_path: this.texture.relativePath,
        parent: this.parent
      },
      this.zIndex == null ? {} : { z_index: this.zIndex }
    ) // omitemptys
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
  }

  static load(
    { tilemap, decorators: rawDecorators = [], sprites = [] }: RawTilemapConfig,
    rawTilemapPath: string,
    parentDir: string,
    files: Files
  ): Tilemap | null {
    const currentDir = join(parentDir, tileAssetPath)

    if (tilemap == null) {
      console.error('"tilemap" is required')
      return null
    }
    const { layers: rawLayers = [], format, tile_size, tileset } = tilemap

    if (tile_size == null) {
      console.error('"tile_size" is required')
      return null
    }

    const tileTextures = TileTextures.load(files, currentDir)
    const tileSet = TileSet.load({ sources: tileset?.sources ?? [] }, currentDir, tileTextures)
    const decorators = rawDecorators.flatMap((d) => Decorator.load(d, currentDir, tileTextures) ?? [])
    const layers = rawLayers.flatMap(({ id, name = '', tile_data = [] }) =>
      id != null ? { id, name, tileData: tile_data } : []
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

  export(): [RawTilemapConfig, Files] {
    const { format, tileSize, tileSet, layers, decorators, tileTextures, extraConfig } = this
    const textures = tileTextures.export()
    const rawTileSet = tileSet.export()
    return [
      {
        tilemap: {
          format,
          tile_size: tileSize,
          tileset: rawTileSet,
          layers: layers.map(({ id, name, tileData }) => ({ id, name, tile_data: tileData }))
        },
        decorators: decorators.map((decorator) => decorator.export()),
        ...extraConfig
      },
      {
        ...textures
      }
    ]
  }
}
