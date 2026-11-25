<script lang="ts">
import { gameCellSize, gameGrid, gameLayout, type Game } from './generation-game'

export type LoadingDot = { x: number; y: number; radius: number; alpha: number }

const mazeBlendMs = 240
const pelletFadeMs = 160
const dotFramesPerSecond = 30

/** Prepares the backing store at device pixel ratio, or returns null when there is nothing to draw on. */
function prepareCanvas(el: HTMLCanvasElement, { width, height }: { width: number; height: number }) {
  if (width === 0 || height === 0) return null
  const ctx = el.getContext('2d')
  if (ctx == null) return null
  const pixelRatio = window.devicePixelRatio
  el.width = Math.round(width * pixelRatio)
  el.height = Math.round(height * pixelRatio)
  ctx.scale(pixelRatio, pixelRatio)
  return ctx
}

function paintDots(ctx: CanvasRenderingContext2D, color: string, dots: LoadingDot[]) {
  ctx.fillStyle = color
  for (const dot of dots) {
    ctx.globalAlpha = dot.alpha
    ctx.beginPath()
    ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

type DotGrid = { columns: number; rows: number; scale: number; x: number; y: number }

// Thumbnails use the same light field, without the maze's status-row space.
function thumbnailGrid(width: number, height: number): DotGrid {
  const columns = Math.max(1, Math.floor((width - 16) / 12) + 1)
  const rows = Math.max(1, Math.floor((height - 16) / 12) + 1)
  return {
    columns,
    rows,
    scale: 12 / gameCellSize,
    x: (width - (columns - 1) * 12) / 2,
    y: (height - (rows - 1) * 12) / 2
  }
}

function smooth(value: number) {
  return value * value * (3 - 2 * value)
}

// A single connected light field deforms continuously instead of splitting into competing patches.
function lightIntensity(nx: number, ny: number, time: number, seed: number) {
  const phase = seed * Math.PI * 2
  const centerX = 0.5 + Math.sin(time * 0.75 + phase) * 0.24
  const centerY = 0.5 + Math.sin(time * 0.53 + phase * 0.7) * 0.2
  const dx = (nx - centerX + Math.sin(ny * 3 + time * 0.55) * 0.08) / 0.64
  const dy = (ny - centerY) / (0.58 + Math.sin(time * 0.4 + phase) * 0.05)
  const field = Math.exp(-2 * (dx * dx + dy * dy))
  return smooth(Math.max(0, Math.min(1, (field - 0.12) / 0.48)))
}

function pelletAlpha(game: Game, row: number, column: number, now: number) {
  // Out-of-range columns would alias a neighboring row's cell key. Rows need no bound check:
  // with columns in range, keys of different rows never alias, so a missing row simply misses.
  if (column < 0 || column >= game.columns) return 0
  const key = row * game.columns + column
  if (!game.pellets.has(key)) return 0
  const eatenAt = game.eaten.get(key)
  const opacity = eatenAt == null ? 1 : Math.max(0, 1 - (now - eatenAt) / pelletFadeMs)
  return 0.65 * opacity
}

function gameBlend(game: Game | null, reduced: boolean, now: number) {
  if (game == null) return 0
  return reduced ? 1 : Math.min(1, (now - game.startedAt) / mazeBlendMs)
}

function fieldTime(game: Game | null, reduced: boolean, started: number, now: number) {
  return reduced ? 0 : ((game?.startedAt ?? now) - started) / 1000
}

function dotRange(grid: DotGrid, width: number, height: number, compact: boolean) {
  const spacing = gameCellSize * grid.scale
  return {
    firstRow: compact ? 0 : Math.ceil(-grid.y / spacing),
    firstColumn: compact ? 0 : Math.ceil(-grid.x / spacing),
    rowCount: compact ? grid.rows : Math.ceil((height - grid.y) / spacing),
    columnCount: compact ? grid.columns : Math.ceil((width - grid.x) / spacing)
  }
}

/**
 * One frame of the loading dot field.
 * @returns The dots to paint, or null when the viewport is too small to draw, so the caller stops scheduling frames.
 */
export function loadingDots(options: {
  width: number
  height: number
  compact: boolean
  seed: number
  /** Light-field start in the same clock as `now`; the field freezes once a game starts. */
  started: number
  reduced: boolean
  now: number
  game: Game | null
}): LoadingDot[] | null {
  const { width, height, compact, seed, started, reduced, now, game } = options
  let grid: DotGrid
  if (game != null) grid = { ...game, ...gameLayout(game, width, height) }
  else if (compact) grid = thumbnailGrid(width, height)
  else grid = gameGrid(width, height)
  const spacing = gameCellSize * grid.scale
  // A collapsed viewport has no drawable grid. The size watcher resumes on resize.
  if (spacing < 1) return null
  const { firstRow, firstColumn, rowCount, columnCount } = dotRange(grid, width, height, compact)
  const blend = gameBlend(game, reduced, now)
  const time = fieldTime(game, reduced, started, now)
  const radius = compact ? 1.2 : 1.7 * grid.scale
  const dots: LoadingDot[] = []
  for (let row = firstRow; row < rowCount; row++) {
    for (let column = firstColumn; column < columnCount; column++) {
      const x = grid.x + column * spacing
      const y = grid.y + row * spacing
      let alpha = game == null ? 0 : pelletAlpha(game, row, column, now)
      if (blend < 1) {
        const loading = reduced ? 0.45 : 0.04 + lightIntensity(x / width, y / height, time, seed) * 0.96
        alpha = loading + (alpha - loading) * blend
      }
      dots.push({ x, y, radius, alpha })
    }
  }
  return dots
}
</script>
<script setup lang="ts">
import { computed, onScopeDispose, ref, toRaw, watch } from 'vue'
import { useContentSize } from '@/utils/dom'
import { useUIVariables } from '@/components/ui'
import GenerationGame from './GenerationGame.vue'

const props = withDefaults(
  defineProps<{
    cover?: boolean
    visible?: boolean
    playable?: boolean
    completed?: boolean
    compact?: boolean
    footer?: boolean
  }>(),
  {
    cover: false,
    visible: true,
    playable: false,
    completed: false,
    compact: false
  }
)
const game = ref<Game | null>(null)
// Keep the child mounted as it transitions from playing to its result on generation completion.
const celebrating = computed(
  () => game.value?.status === 'won' || (props.completed && game.value?.status === 'playing')
)
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const reducedMotion = ref(motionQuery.matches)
const updateMotion = () => (reducedMotion.value = motionQuery.matches)
motionQuery.addEventListener('change', updateMotion)
onScopeDispose(() => motionQuery.removeEventListener('change', updateMotion))

const canvas = ref<HTMLCanvasElement | null>(null)
const size = useContentSize(canvas)
const uiVariables = useUIVariables()
// Keep one motion seed per loading session, including when the preview resizes.
const motion = ref<{ seed: number; started: number } | null>(null)
watch([canvas, () => props.compact], ([el, compact]) => {
  motion.value =
    el == null ? null : { seed: compact ? 0 : Math.random() * 1024, started: compact ? 0 : performance.now() }
})

watch([motion, size, reducedMotion, game], ([motion, dimensions, reduced, current], _, onCleanup) => {
  const el = canvas.value
  if (el == null || motion == null || dimensions == null) return
  const ctx = prepareCanvas(el, dimensions)
  if (ctx == null) return
  const { width, height } = dimensions
  const { seed, started } = motion
  let frame: number | null = null
  let lastPaintedFrame = -1
  let animateUntil = reduced ? 0 : Infinity
  if (current != null && !reduced) animateUntil = current.startedAt + mazeBlendMs

  const draw = (now: number) => {
    frame = null
    const frameIndex = Math.floor((now * dotFramesPerSecond) / 1000)
    if (frameIndex > lastPaintedFrame || now >= animateUntil) {
      const dots = loadingDots({
        width,
        height,
        compact: props.compact,
        seed,
        started,
        reduced,
        now,
        game: toRaw(current)
      })
      ctx.clearRect(0, 0, width, height)
      if (dots == null) return
      paintDots(ctx, uiVariables.color.primary.main, dots)
      lastPaintedFrame = frameIndex
    }
    if (now < animateUntil) frame = requestAnimationFrame(draw)
  }

  // Once the maze is visible, only newly eaten dots need more frames.
  const stop = watch(
    () => current?.eaten.size ?? 0,
    (eaten) => {
      const now = performance.now()
      if (eaten > 0) animateUntil = Math.max(animateUntil, now + pelletFadeMs)
      if (frame == null) draw(now)
    },
    { immediate: true }
  )
  onCleanup(() => {
    stop()
    if (frame != null) cancelAnimationFrame(frame)
  })
})
</script>

<template>
  <Transition name="generation" :css="!reducedMotion" :duration="reducedMotion ? 0 : { enter: 0, leave: 500 }">
    <div v-if="visible || celebrating" class="gen-loading" :class="{ cover }" role="status" aria-live="polite">
      <canvas ref="canvas" class="flow" aria-hidden="true"></canvas>
      <GenerationGame
        v-if="size != null && (playable || game != null)"
        :enabled="playable && visible"
        :completed="completed"
        :viewport="size"
        @change="game = $event"
      />
      <div
        v-if="($slots.default != null || game != null) && game?.status !== 'won'"
        class="message"
        :class="footer ? 'text-xs text-hint-2' : 'centered text-base text-text'"
      >
        <div class="min-w-0"><slot></slot></div>
        <div
          v-if="game?.status === 'playing'"
          class="flex shrink-0 items-center gap-2 text-text tabular-nums"
          aria-live="off"
          :aria-label="
            $t({
              en: `Dots: ${game.eaten.size} of ${game.pellets.size}`,
              zh: `豆子：${game.eaten.size} / ${game.pellets.size}`
            })
          "
        >
          <span class="w-1.5 h-1.5 rounded-full bg-primary-main" aria-hidden="true"></span>
          <span class="font-semibold">{{ game.eaten.size }}</span>
          <span class="text-hint">/ {{ game.pellets.size }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.gen-loading {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-200);
}

.gen-loading.cover {
  position: absolute;
  inset: 0;
}

.flow {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.message {
  position: absolute;
  bottom: 8px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  text-align: left;
}

.message.centered {
  top: 50%;
  bottom: auto;
  justify-content: center;
  transform: translateY(-50%);
  text-align: center;
}

.generation-leave-active {
  pointer-events: none;
  transition: opacity 500ms ease-in-out;
}

.generation-leave-to {
  opacity: 0;
}
</style>
