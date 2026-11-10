<script setup lang="ts">
import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from 'vue'
import {
  createGame,
  directions,
  gameCellSize,
  gameGrid,
  gameLayout,
  gameStepMs,
  stepGame,
  type Direction,
  type Game
} from './generation-game'
import GenerationGameResult from './GenerationGameResult.vue'

const props = defineProps<{ enabled: boolean; completed?: boolean; viewport: { width: number; height: number } }>()
const emit = defineEmits<{ change: [Game | null] }>()
const root = ref<HTMLElement | null>(null)
const board = ref<SVGSVGElement | null>(null)
const game = ref<Game | null>(null)
const layout = computed(() =>
  game.value == null ? null : gameLayout(game.value, props.viewport.width, props.viewport.height)
)
let previousFocus: HTMLElement | null = null
let timer: ReturnType<typeof setInterval> | null = null
let hasFinished = false
const wasdDirections: Record<string, Direction> = {
  w: 'ArrowUp',
  a: 'ArrowLeft',
  s: 'ArrowDown',
  d: 'ArrowRight'
}

function exit() {
  if (timer != null) clearInterval(timer)
  timer = null
  if (document.activeElement === board.value && previousFocus?.isConnected) previousFocus.focus()
  game.value = null
  emit('change', null)
}

watch(
  () => props.enabled,
  (enabled) => {
    if (!enabled) return
    hasFinished = false
    if (game.value?.status === 'won' || game.value?.status === 'caught') exit()
  }
)

watch(
  () => game.value?.status,
  (status, _, onCleanup) => {
    if (status !== 'caught' && status !== 'won') return
    hasFinished = true
    if (timer != null) clearInterval(timer)
    timer = null
    const timeout = setTimeout(exit, status === 'won' ? 5000 : 600)
    onCleanup(() => clearTimeout(timeout))
  }
)

function start(direction: Direction) {
  const { columns, rows } = gameGrid(props.viewport.width, props.viewport.height)
  game.value = createGame(direction, columns, rows, performance.now())
  emit('change', game.value)
}

async function handleKeydown(event: KeyboardEvent) {
  if (
    game.value?.status === 'won' &&
    event.target instanceof Node &&
    root.value?.contains(event.target) &&
    (event.key === 'Escape' || event.key === 'Enter')
  ) {
    event.preventDefault()
    event.stopPropagation()
    if (props.completed) exit()
    return
  }
  if (game.value?.status === 'won') return
  if (!props.enabled || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
    return
  const target = event.target
  if (
    target instanceof Element &&
    target.closest(
      'input, textarea, select, canvas, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="slider"], [role="toolbar"], [role="menu"], [role="listbox"], [role="tablist"], [role="tree"], [role="grid"]'
    ) != null
  )
    return
  const bounds = root.value?.getBoundingClientRect()
  if (bounds == null || bounds.width === 0 || bounds.height === 0 || document.hidden) return
  const modal = document.querySelector('[aria-modal="true"]')
  if (modal != null && !modal.contains(root.value)) return
  if (event.key === 'Escape') {
    if (game.value == null) return
    event.preventDefault()
    event.stopPropagation()
    exit()
    return
  }
  const direction = (wasdDirections[event.key.toLowerCase()] ?? event.key) as Direction
  if (hasFinished || !(direction in directions)) return
  event.preventDefault()
  event.stopPropagation()
  if (game.value == null) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    start(direction)
    timer = setInterval(() => {
      const current = game.value
      if (!props.enabled || current == null || document.hidden || document.activeElement !== board.value) return
      const now = performance.now()
      if (current.status === 'playing') stepGame(current, now)
    }, gameStepMs)
  } else {
    game.value.turn = direction
  }
  await nextTick()
  board.value?.focus()
}

onMounted(() => window.addEventListener('keydown', handleKeydown, true))
onScopeDispose(() => {
  window.removeEventListener('keydown', handleKeydown, true)
  exit()
})
</script>

<template>
  <div ref="root" class="absolute inset-0 pointer-events-none">
    <Transition name="characters">
      <svg
        v-if="game != null && layout != null"
        ref="board"
        class="absolute inset-0 h-full w-full pointer-events-auto focus:outline-none"
        :viewBox="`0 0 ${viewport.width} ${viewport.height}`"
        role="application"
        tabindex="-1"
        :aria-label="
          $t({
            en: 'Maze game. Use arrow keys or WASD to move, Escape to exit.',
            zh: '迷宫躲避。方向键或 WASD 移动，Esc 退出。'
          })
        "
      >
        <g :transform="`translate(${layout.x} ${layout.y}) scale(${layout.scale})`">
          <path
            :d="game.walls"
            class="fill-none stroke-primary-300"
            :class="{ won: game.status === 'won' }"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            v-if="game.status === 'caught'"
            :cx="game.player.x * gameCellSize"
            :cy="game.player.y * gameCellSize"
            r="10"
            class="collision fill-none stroke-grey-800"
            stroke-width="2"
          />
          <g
            class="player"
            :class="{ reset: game.ticks === 0, caught: game.status === 'caught' }"
            :style="{
              transform: `translate(${game.player.x * gameCellSize}px, ${game.player.y * gameCellSize}px)`,
              '--move-duration': `${gameStepMs}ms`
            }"
          >
            <g :transform="`rotate(${directions[game.direction].angle})`">
              <path
                :d="game.ticks % 2 === 0 ? 'M0 0L4.2 -4.2A6 6 0 1 0 4.2 4.2Z' : 'M0 0L5.8 -1.5A6 6 0 1 0 5.8 1.5Z'"
                class="fill-primary-main"
              />
            </g>
          </g>
          <g
            v-for="(ghost, index) in game.ghosts"
            :key="index"
            class="ghost"
            :class="{ reset: game.ticks === 0 || ghost.restUntil > game.ticks * gameStepMs }"
            :style="{
              transform: `translate(${ghost.x * gameCellSize}px, ${ghost.y * gameCellSize}px)`,
              opacity: ghost.restUntil > game.ticks * gameStepMs ? 0.3 : 1,
              '--move-duration': `${gameStepMs * 2}ms`
            }"
          >
            <path
              d="M-5 5V0a5 5 0 0 1 10 0v5L2.5 3.5 0 5-2.5 3.5Z"
              :class="index === 0 ? 'fill-grey-900' : 'fill-grey-800'"
            />
            <circle cx="-1.8" cy="0" r="1.3" class="fill-grey-100" />
            <circle cx="1.8" cy="0" r="1.3" class="fill-grey-100" />
          </g>
        </g>
      </svg>
    </Transition>
    <span v-if="game?.status === 'caught'" class="sr-only" role="status">
      {{ $t({ en: 'Caught. Returning to loading.', zh: '被抓到了，返回加载。' }) }}
    </span>
    <GenerationGameResult v-if="game != null && game.status === 'won'" :score="game.eaten.size" />
  </div>
</template>

<style scoped>
.won {
  animation: maze-complete 500ms ease-out both;
}
@keyframes maze-complete {
  35% {
    stroke: var(--ui-color-primary-main);
  }
}

.collision {
  transform-box: fill-box;
  transform-origin: center;
  animation: collision 400ms ease-out both;
}
@keyframes collision {
  to {
    transform: scale(2);
    opacity: 0;
  }
}
.player,
.ghost {
  transition:
    transform var(--move-duration) linear,
    opacity 180ms ease-out;
}
.reset {
  transition: opacity 180ms ease-out;
}
.caught {
  opacity: 0;
}
.characters-enter-active,
.characters-leave-active {
  transition: opacity 240ms ease-out;
}
.characters-enter-from,
.characters-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .collision,
  .won {
    animation: none;
  }
  .player,
  .ghost,
  .characters-enter-active,
  .characters-leave-active {
    transition: none;
  }
}
</style>
