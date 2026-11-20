import { describe, it, expect } from 'vitest'
import { DumbTilemap, Tilemap, type Coord, type RawTilemapConfig, type RawTileSourceConfig } from './tilemap'
import { File, fromConfig, toConfig, type Files } from '../common/file'
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

function markLayer(id: number, name: string, z_index: number, tile_data = []) {
  return {
    id,
    name,
    z_index,
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
      layers: [markLayer(0, '1', 0, []), markLayer(1, '2', 1, [])]
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

  const rawTilemapPath = join(tilemapPathName, 'scene1.json')
  const fullRawTilemapPath = join(assetsPathName, rawTilemapPath)

  const grassPath = join(texturePathName, '草地')
  const grass1 = '草地1.png'
  const road1 = '路1.png'
  const grass1TexturePath = join(grassPath, grass1)
  const road1TexturePath = join(grassPath, road1)

  it('should load tilemap correctly', async () => {
    const tilemapConfig = markTilemap([
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

    const tilemapFiles: Files = {
      [fullRawTilemapPath]: fromConfig(fullRawTilemapPath, tilemapConfig),
      [join(tilemapPath, grass1TexturePath)]: markTexture(grass1),
      [join(tilemapPath, road1TexturePath)]: markTexture(road1)
    }

    const tile = await Tilemap.load(rawTilemapPath, assetsPathName, tilemapFiles)

    expect(tile?.tilemapPath).toBe(rawTilemapPath)
    expect(tile?.tileSet.sources[0]?.id).toBe(tilemapConfig.tilemap.tileset.sources[0].id)
    expect(tile?.tileSet.sources[0]?.tiles[0].atlasCoords).toEqual(
      tilemapConfig.tilemap.tileset.sources[0].tiles?.[0].atlas_coords
    )
    expect(tile?.tileSet.sources[0]?.tiles[0].physics.collisionPoints).toEqual(
      tilemapConfig.tilemap.tileset.sources[0].tiles?.[0]?.physics?.collision_points
    )
    expect(tile?.tileSet.sources[0]?.texture.relativePath).toBe(tilemapConfig.tilemap.tileset.sources[0].texture_path)

    expect(tile?.layers[0].id).toBe(tilemapConfig.tilemap.layers[0].id)
    expect(tile?.layers[0].name).toBe(tilemapConfig.tilemap.layers[0].name)
    expect(tile?.layers[0].zIndex).toBe(tilemapConfig.tilemap.layers[0].z_index)
    expect(tile?.layers[0].tileData).toEqual(tilemapConfig.tilemap.layers[0].tile_data)
    expect(tile?.layers[1].id).toBe(tilemapConfig.tilemap.layers[1].id)
    expect(tile?.layers[1].name).toBe(tilemapConfig.tilemap.layers[1].name)
    expect(tile?.layers[1].zIndex).toBe(tilemapConfig.tilemap.layers[1].z_index)
    expect(tile?.layers[1].tileData).toEqual(tilemapConfig.tilemap.layers[1].tile_data)

    expect(tile?.tileSet.sources[1]?.id).toBe(tilemapConfig.tilemap.tileset.sources[1].id)
    expect(tile?.tileSet.sources[1]?.tiles[0].atlasCoords).toEqual(
      tilemapConfig.tilemap.tileset.sources[1].tiles?.[0].atlas_coords
    )
    expect(tile?.tileSet.sources[1]?.tiles[0].physics.collisionPoints).toEqual(
      tilemapConfig.tilemap.tileset.sources[1].tiles?.[0]?.physics?.collision_points
    )
    expect(tile?.tileSet.sources[1]?.texture.relativePath).toBe(tilemapConfig.tilemap.tileset.sources[1].texture_path)
  })

  it('should export tilemap correctly', async () => {
    const tilemapConfig = markTilemap([
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

    const tilemapFiles: Files = {
      [fullRawTilemapPath]: fromConfig(fullRawTilemapPath, tilemapConfig),
      [join(tilemapPath, grass1TexturePath)]: markTexture(grass1),
      [join(tilemapPath, road1TexturePath)]: markTexture(road1)
    }

    const tile = await Tilemap.load('tilemaps/scene1.json', assetsPathName, tilemapFiles)

    const tileFiles = tile!.export(assetsPathName)
    const rawTilemapConfig = (await toConfig(tileFiles[fullRawTilemapPath]!)) as RawTilemapConfig

    expect(rawTilemapConfig.tilemap?.format).toBe(tilemapConfig.tilemap.format)
    expect(rawTilemapConfig.tilemap?.tile_size).toEqual(tilemapConfig.tilemap.tile_size)
    expect(rawTilemapConfig.tilemap?.tileset).toEqual(tilemapConfig.tilemap.tileset)
    expect(rawTilemapConfig.tilemap?.layers).toEqual(tilemapConfig.tilemap.layers)

    expect(rawTilemapConfig.decorators).toEqual(tilemapConfig.decorators)

    expect(rawTilemapConfig.sprites).toEqual(tilemapConfig.sprites)
  })
})

describe('DumbTilemap', () => {
  it('loads legacy decorators relative to the tilemaps asset directory and preserves files', async () => {
    const files: Files = {
      'assets/tilemaps/river.json': fromConfig('river.json', {
        tilemap: { layers: [] },
        decorators: [{ path: 'tree.png', position: { x: 12, y: 34 } }]
      }),
      'assets/tilemaps/tree.png': markTexture('tree.png'),
      'assets/tilemaps/other/map.json': fromConfig('map.json', {})
    }

    const tilemap = await DumbTilemap.load('tilemaps/river.json', 'assets', files)

    expect(tilemap?.tilemapPath).toBe('tilemaps/river.json')
    expect(tilemap?.decorators[0].img).toBe(files['assets/tilemaps/tree.png'])
    expect(tilemap?.decorators[0].position).toEqual({ x: 12, y: 34 })
    expect(tilemap?.export('assets')).toEqual(files)
  })

  it.each(['tilemaps/river', 'worlds/river'])(
    'loads directory %s with local decorators and preserves opaque map data',
    async (path) => {
      const configPath = `assets/${path}/tilemap.json`
      const files: Files = {
        [configPath]: fromConfig('tilemap.json', {
          version: 1,
          node_offset: [-240, -180],
          tileset: {
            tile_size: [480, 360],
            physics_layers: [{ collision_layer: 8, collision_mask: 4 }]
          },
          layers: [{ name: 'banks', tile_map_data: 'AAA=' }]
        }),
        [`assets/${path}/decorator.json`]: fromConfig('decorator.json', {
          version: 1,
          decorators: [{ path: 'textures/tree.png', position: { x: 12, y: 34 } }]
        }),
        [`assets/${path}/textures/tree.png`]: markTexture('tree.png'),
        [`assets/${path}/atlas.png`]: markTexture('atlas.png'),
        'assets/tilemaps/other/map.json': fromConfig('map.json', {})
      }

      const tilemap = await DumbTilemap.load(path, 'assets', files)
      const exported = tilemap!.export('assets')

      expect(tilemap?.tilemapPath).toBe(path)
      expect(tilemap?.decorators[0].img).toBe(files[`assets/${path}/textures/tree.png`])
      expect(tilemap?.decorators[0].position).toEqual({ x: 12, y: 34 })
      expect(exported).toEqual(files)
      expect(exported[configPath]).toBe(files[configPath])
    }
  )

  it('loads a directory without optional decorators', async () => {
    const files = {
      'assets/tilemaps/river/tilemap.json': fromConfig('tilemap.json', { version: 1 })
    }

    const tilemap = await DumbTilemap.load('tilemaps/river', 'assets', files)

    expect(tilemap?.decorators).toEqual([])
    expect(tilemap?.export('assets')).toEqual(files)
  })

  it.each([
    ['tilemaps/missing.json', 'assets/tilemaps/missing.json'],
    ['tilemaps/missing', 'assets/tilemaps/missing/tilemap.json']
  ])('reports a missing map at %s', async (path, configPath) => {
    await expect(DumbTilemap.load(path, 'assets', {})).rejects.toThrow(`tilemap file not found: ${configPath}`)
  })
})
