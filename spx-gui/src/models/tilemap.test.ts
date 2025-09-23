import { describe, it, expect } from 'vitest'
import { Tilemap, type Coord, type RawTileSourceConfig } from './tilemap'
import { File, type Files } from './common/file'
import { join } from '@/utils/path'

function markSource(id: number, path: string, coord: Coord, collisionPoints?: Coord[]) {
  const physics = {}
  if (collisionPoints) {
    Object.assign(physics, { collision_points: collisionPoints })
  }
  return {
    id,
    texture_path: path,
    tiles: [
      {
        atlas_coords: coord,
        physics
      }
    ]
  }
}

function markSprite(name: string, position: Coord, path: string, parent = '.') {
  return {
    name,
    parent,
    position,
    path
  }
}

function markLayer(id: number, name: string, tile_data = []) {
  return {
    id,
    name,
    tile_data
  }
}

function markTexture(name: string) {
  return new File(name, async () => new ArrayBuffer(0))
}

function markTilemap(sources: RawTileSourceConfig[]) {
  return {
    tilemap: {
      format: 0,
      tile_size: {
        width: 16,
        height: 16
      },
      tileset: { sources },
      layers: [markLayer(0, '1', []), markLayer(1, '2', [])]
    },
    decorators: [],
    sprites: [
      markSprite('盆栽', { x: 508, y: 381 }, '盆栽'),
      markSprite(
        '药品柜',
        {
          x: 835,
          y: 481
        },
        '药品柜'
      )
    ]
  }
}

const assetsPathName = 'assets'
const tilemapPathName = 'tilemaps'
const texturePathName = 'textures'

describe('Tile', () => {
  const tilemapPath = join(assetsPathName, tilemapPathName)

  const grassPath = join(texturePathName, '草地')
  const grass1 = '草地1.png'
  const road1 = '路1.png'
  const grass1TexturePath = join(grassPath, grass1)
  const road1TexturePath = join(grassPath, road1)

  it('should load tilemap correctly', () => {
    const tilemapFiles: Files = {
      [join(tilemapPath, grass1TexturePath)]: markTexture(grass1),
      [join(tilemapPath, road1TexturePath)]: markTexture(road1)
    }
    const tilemap = markTilemap([
      markSource(0, grass1TexturePath, { x: 0, y: 0 }),
      markSource(1, road1TexturePath, { x: 0, y: 0 }, [
        {
          x: -8,
          y: -8
        },
        {
          x: 8,
          y: -8
        },
        {
          x: 8,
          y: 8
        },
        {
          x: -8,
          y: 8
        }
      ])
    ])

    const tile = Tilemap.load(tilemap, 'tilemaps/scene1.json', assetsPathName, tilemapFiles)

    expect(tile?.tilemapPath).toBe('tilemaps/scene1.json')
    expect(tile?.tileSet.sources[0]?.id).toBe(tilemap.tilemap.tileset.sources[0].id)
    expect(tile?.tileSet.sources[0]?.tiles[0].atlasCoords).toBe(
      tilemap.tilemap.tileset.sources[0].tiles?.[0].atlas_coords
    )
    expect(tile?.tileSet.sources[0]?.tiles[0].physics.collisionPoints).toBe(
      tilemap.tilemap.tileset.sources[0].tiles?.[0]?.physics?.collision_points
    )
    expect(tile?.tileSet.sources[0]?.texture.relativePath).toBe(tilemap.tilemap.tileset.sources[0].texture_path)

    expect(tile?.tileSet.sources[1]?.id).toBe(tilemap.tilemap.tileset.sources[1].id)
    expect(tile?.tileSet.sources[1]?.tiles[0].atlasCoords).toBe(
      tilemap.tilemap.tileset.sources[1].tiles?.[0].atlas_coords
    )
    expect(tile?.tileSet.sources[1]?.tiles[0].physics.collisionPoints).toBe(
      tilemap.tilemap.tileset.sources[1].tiles?.[0]?.physics?.collision_points
    )
    expect(tile?.tileSet.sources[1]?.texture.relativePath).toBe(tilemap.tilemap.tileset.sources[1].texture_path)
  })

  it('should export tilemap correctly', () => {
    const tilemapFiles: Files = {
      [join(tilemapPath, grass1TexturePath)]: markTexture(grass1),
      [join(tilemapPath, road1TexturePath)]: markTexture(road1)
    }
    const tilemap = markTilemap([
      markSource(0, grass1TexturePath, { x: 0, y: 0 }),
      markSource(1, road1TexturePath, { x: 0, y: 0 }, [
        {
          x: -8,
          y: -8
        },
        {
          x: 8,
          y: -8
        },
        {
          x: 8,
          y: 8
        },
        {
          x: -8,
          y: 8
        }
      ])
    ])

    const tile = Tilemap.load(tilemap, 'tilemaps/scene1.json', assetsPathName, tilemapFiles)

    const [rawTilemapConfig, tileFiles] = tile!.export()

    expect(rawTilemapConfig.tilemap?.format).toBe(tilemap.tilemap.format)
    expect(rawTilemapConfig.tilemap?.tile_size).toBe(tilemap.tilemap.tile_size)
    expect(rawTilemapConfig.tilemap?.tileset).toEqual(tilemap.tilemap.tileset)
    expect(rawTilemapConfig.tilemap?.layers).toEqual(tilemap.tilemap.layers)

    expect(rawTilemapConfig.decorators).toEqual(tilemap.decorators)

    expect(rawTilemapConfig.sprites).toEqual(tilemap.sprites)

    expect(tilemapFiles).toEqual(tileFiles)
  })
})
