import { describe, expect, it } from 'vitest'
import { createGame, gameGrid, stepGame } from './generation-game'

function ringGame() {
  const game = createGame('ArrowRight', 5, 5, 0)
  game.paths = new Set([6, 7, 8, 11, 13, 16, 17, 18])
  game.player = { x: 1, y: 1 }
  game.pellets = new Set(game.paths)
  game.eaten = new Map([[6, 0]])
  game.ghosts = [
    { x: 3, y: 3 },
    { x: 1, y: 3 }
  ].map((position) => ({ ...position, restUntil: 0 }))
  return game
}

describe('generation game', () => {
  it.each([
    [180, 180],
    [360, 360],
    [720, 560]
  ])('fits the maze to the shared loading grid at %i × %i', (width, height) => {
    const grid = gameGrid(width, height)
    const game = createGame('ArrowRight', grid.columns, grid.rows, 0)
    expect(game.columns).toBe(grid.columns)
    expect(game.rows).toBe(grid.rows)
    expect(grid.x).toBeGreaterThan(0)
    expect(grid.y).toBeGreaterThan(0)
    const spacing = 20 * grid.scale
    expect((game.columns - 1) * spacing).toBeGreaterThan(width - spacing * 2 - 8)
    expect((game.rows - 1) * spacing).toBeGreaterThan(height - 32 - spacing * 2 - 8)
    if (width >= 360) expect(game.pellets.size).toBeGreaterThan(50)
  })

  it.each([
    [15, 7],
    [30, 22],
    [48, 32]
  ])('keeps every maze pellet reachable at %i × %i', (columns, rows) => {
    const game = createGame('ArrowRight', columns, rows, 0)
    const queue = [game.player.y * game.columns + game.player.x]
    const visited = new Set(queue)
    for (let i = 0; i < queue.length; i++) {
      const key = queue[i]
      const adjacent = [key - 1, key + 1, key - game.columns, key + game.columns].filter((key) => game.paths.has(key))
      expect(adjacent.length).toBeGreaterThanOrEqual(2)
      for (const next of adjacent) {
        if (visited.has(next)) continue
        visited.add(next)
        queue.push(next)
      }
    }
    expect(visited).toEqual(game.paths)
    expect(game.pellets.size).toBe(game.paths.size - 1)
    expect(game.ghosts).toHaveLength(1)
    for (const key of game.pellets) expect(visited.has(key)).toBe(true)
    for (const ghost of game.ghosts) expect(visited.has(ghost.y * game.columns + ghost.x)).toBe(true)
    expect(game.walls).not.toBe('')
  })

  it('stops at walls and buffers a turn until the next junction', () => {
    const game = ringGame()
    game.ghosts = []
    stepGame(game, 120)
    game.turn = 'ArrowDown'
    stepGame(game, 240)
    expect(game.player).toEqual({ x: 3, y: 1 })
    stepGame(game, 360)
    expect(game.player).toEqual({ x: 3, y: 2 })
    stepGame(game, 480)
    stepGame(game, 600)
    expect(game.player).toEqual({ x: 3, y: 3 })
    expect(game.eaten.size).toBe(5)
    expect(game.eaten.get(18)).toBe(480)
  })

  it('routes both ghosts through corridors and freezes on collision', () => {
    const game = ringGame()
    stepGame(game, 120)
    expect(game.ghosts.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 3, y: 3 },
      { x: 1, y: 3 }
    ])
    stepGame(game, 240)
    expect(game.ghosts.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 3, y: 2 },
      { x: 2, y: 3 }
    ])
    game.turn = 'ArrowDown'
    stepGame(game, 360)
    expect(game.status).toBe('caught')
    expect(game.finishedAt).toBe(360)
    stepGame(game, 480)
    expect(game.player).toEqual({ x: 3, y: 2 })
  })

  it.each([false, true])('wins after the last pellet unless caught on the same step (collision: %s)', (collision) => {
    const game = ringGame()
    game.eaten = new Map([...game.paths].map((key) => [key, 0]))
    game.eaten.delete(7)
    if (collision) Object.assign(game.ghosts[0], { x: 2, y: 1 })
    stepGame(game, 120)
    expect(game.eaten.size).toBe(game.paths.size)
    expect(game.status).toBe(collision ? 'caught' : 'won')
    expect(game.finishedAt).toBe(120)
  })

  it('keeps ghost collisions lethal after eight seconds', () => {
    const game = ringGame()
    game.ticks = 79
    Object.assign(game.ghosts[0], { x: 2, y: 1 })
    stepGame(game, 8000)
    expect(game.status).toBe('caught')
    expect(game.finishedAt).toBe(8000)
  })

  it('freezes the maze and score after winning', () => {
    const game = ringGame()
    game.ghosts = []
    const eaten = new Map([...game.pellets].map((key) => [key, 0]))
    game.eaten = new Map(eaten)
    const paths = game.paths
    game.status = 'won'
    const position = game.player
    stepGame(game, 150)
    expect(game.player).toBe(position)
    expect(game.ticks).toBe(0)
    expect(game.eaten).toEqual(eaten)
    expect(game.paths).toBe(paths)
    expect(game.status).toBe('won')
  })
})
