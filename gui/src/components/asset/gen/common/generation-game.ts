export const gameCellSize = 20
export const gameStepMs = 100
export const directions = {
  ArrowRight: { x: 1, y: 0, angle: 0 },
  ArrowDown: { x: 0, y: 1, angle: 90 },
  ArrowLeft: { x: -1, y: 0, angle: 180 },
  ArrowUp: { x: 0, y: -1, angle: 270 }
}
export type Direction = keyof typeof directions
type Position = { x: number; y: number }
export type Game = ReturnType<typeof createGame>
type Ghost = Game['ghosts'][number]

function mazeSize(cells: number) {
  return Math.max(5, cells - (cells % 2 === 0 ? 1 : 0))
}

export function gameGrid(width: number, height: number) {
  const columns = mazeSize(Math.floor(width / gameCellSize))
  const rows = mazeSize(Math.floor((height - 32) / gameCellSize))
  return { columns, rows, ...gameLayout({ columns, rows }, width, height) }
}

export function gameLayout(game: Pick<Game, 'columns' | 'rows'>, width: number, height: number) {
  // Leave only the wall stroke inset and the loading status row outside the maze.
  const scale = Math.min(
    (width - 8) / ((game.columns - 1) * gameCellSize),
    (height - 40) / ((game.rows - 1) * gameCellSize)
  )
  return {
    scale,
    x: (width - (game.columns - 1) * gameCellSize * scale) / 2,
    y: (height - 32 - (game.rows - 1) * gameCellSize * scale) / 2
  }
}

function cell(columns: number, position: Position) {
  return position.y * columns + position.x
}

function neighbors(paths: Set<number>, columns: number, key: number) {
  return [key + 1, key + columns, key - 1, key - columns].filter((next) => paths.has(next))
}

function isInterior(columns: number, rows: number, position: Position) {
  return position.x > 0 && position.y > 0 && position.x < columns - 1 && position.y < rows - 1
}

function distances(paths: Set<number>, columns: number, start: number) {
  const result = new Map([[start, 0]])
  const queue = [start]
  for (let i = 0; i < queue.length; i++) {
    for (const next of neighbors(paths, columns, queue[i])) {
      if (result.has(next)) continue
      result.set(next, result.get(queue[i])! + 1)
      queue.push(next)
    }
  }
  return result
}

function carve(columns: number, rows: number) {
  const paths = new Set([columns + 1])
  const stack = [{ x: 1, y: 1 }]
  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const options = Object.values(directions)
      .map((delta) => ({ x: current.x + delta.x * 2, y: current.y + delta.y * 2 }))
      .filter((next) => isInterior(columns, rows, next) && !paths.has(cell(columns, next)))
    if (options.length === 0) {
      stack.pop()
      continue
    }
    const next = options[Math.floor(Math.random() * options.length)]
    paths.add(cell(columns, { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2 }))
    paths.add(cell(columns, next))
    stack.push(next)
  }
  return paths
}

/**
 * Opens dead ends into loops so players can evade pursuers instead of being trapped.
 * Carving reaches every interior room, so each dead end has a closed interior wall to open.
 */
function openDeadEnds(paths: Set<number>, columns: number, rows: number) {
  for (const key of [...paths]) {
    if (neighbors(paths, columns, key).length !== 1) continue
    const x = key % columns
    const y = Math.floor(key / columns)
    const walls = Object.values(directions)
      .map((delta) => ({ x: x + delta.x, y: y + delta.y }))
      .filter((wall) => isInterior(columns, rows, wall) && !paths.has(cell(columns, wall)))
    paths.add(cell(columns, walls[Math.floor(Math.random() * walls.length)]))
  }
}

function drawWalls(paths: Set<number>, columns: number, rows: number) {
  const walls: string[] = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const key = y * columns + x
      if (paths.has(key)) continue
      const px = x * gameCellSize
      const py = y * gameCellSize
      if (x < columns - 1 && !paths.has(key + 1)) walls.push(`M${px} ${py}h${gameCellSize}`)
      if (y < rows - 1 && !paths.has(key + columns)) walls.push(`M${px} ${py}v${gameCellSize}`)
      if (neighbors(paths, columns, key).length === 4) walls.push(`M${px - 1} ${py}h2`)
    }
  }
  return walls.join('')
}

function createMaze(columns: number, rows: number) {
  const paths = carve(columns, rows)
  openDeadEnds(paths, columns, rows)
  return { paths, walls: drawWalls(paths, columns, rows) }
}

export function createGame(direction: Direction, columns: number, rows: number, now: number) {
  columns = mazeSize(columns)
  rows = mazeSize(rows)
  const { paths, walls } = createMaze(columns, rows)
  const center = { x: Math.floor(columns / 2), y: Math.floor(rows / 2) }
  const start = [...paths].reduce((best, key) => {
    const distance = (value: number) =>
      Math.abs((value % columns) - center.x) + Math.abs(Math.floor(value / columns) - center.y)
    return distance(key) < distance(best) ? key : best
  })
  const pellets = new Set(paths)
  pellets.delete(start)
  return {
    columns,
    rows,
    paths,
    walls,
    player: { x: start % columns, y: Math.floor(start / columns) },
    ghosts: [{ x: 1, y: 1, restUntil: 900 }],
    direction,
    turn: direction,
    pellets,
    eaten: new Map<number, number>(),
    startedAt: now,
    ticks: 0,
    status: 'playing' as 'playing' | 'caught' | 'won',
    finishedAt: null as number | null
  }
}

function move(game: Game, position: Position, direction: Direction) {
  const delta = directions[direction]
  const next = { x: position.x + delta.x, y: position.y + delta.y }
  return game.paths.has(cell(game.columns, next)) ? next : null
}

function movePlayer(game: Game, now: number) {
  if (move(game, game.player, game.turn) != null) game.direction = game.turn
  game.player = move(game, game.player, game.direction) ?? game.player
  const key = cell(game.columns, game.player)
  if (game.pellets.has(key) && !game.eaten.has(key)) game.eaten.set(key, now)
}

function chase(game: Game, ghost: Ghost, elapsed: number) {
  if (ghost.restUntil > elapsed) return ghost
  const distance = distances(game.paths, game.columns, cell(game.columns, game.player))
  const start = cell(game.columns, ghost)
  const next = neighbors(game.paths, game.columns, start).reduce(
    (best, next) => (distance.get(next)! < distance.get(best)! ? next : best),
    start
  )
  return { ...ghost, x: next % game.columns, y: Math.floor(next / game.columns) }
}

function isCaught(game: Game, elapsed: number) {
  const key = cell(game.columns, game.player)
  return game.ghosts.some((ghost) => ghost.restUntil <= elapsed && cell(game.columns, ghost) === key)
}

export function stepGame(game: Game, now: number) {
  if (game.status !== 'playing') return
  game.ticks++
  const elapsed = game.ticks * gameStepMs
  movePlayer(game, now)
  if (!isCaught(game, elapsed) && game.ticks % 2 === 0) {
    game.ghosts = game.ghosts.map((ghost) => chase(game, ghost, elapsed))
  }
  if (isCaught(game, elapsed)) {
    game.status = 'caught'
    game.finishedAt = now
  } else if (game.eaten.size === game.pellets.size) {
    game.status = 'won'
    game.finishedAt = now
  }
}
