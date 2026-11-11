<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { useContentSize } from '@/utils/dom'
import { useUIVariables } from '@/components/ui'
import GenerationGame from './GenerationGame.vue'
import { gameCellSize, gameGrid, gameLayout, type Game } from './generation-game'

const props = withDefaults(
  defineProps<{ cover?: boolean; visible?: boolean; playable?: boolean; completed?: boolean }>(),
  {
    cover: false,
    visible: true,
    playable: false,
    completed: false
  }
)
const emit = defineEmits<{ hidden: [] }>()
const game = ref<Game | null>(null)
const celebrating = computed(() => game.value?.status === 'won')
watch(
  () => props.completed,
  (completed) => {
    if (!completed || game.value?.status !== 'playing') return
    game.value.status = 'won'
    game.value.finishedAt = performance.now()
  }
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
const motion = computed(() => {
  if (canvas.value == null) return null
  return { seed: Math.random() * 1024, started: performance.now() }
})

function smooth(value: number) {
  return value * value * (3 - 2 * value)
}

watch([motion, size, reducedMotion, () => game.value != null], ([motion, dimensions, reduced], _, onCleanup) => {
  const el = canvas.value
  if (el == null || motion == null || dimensions == null || dimensions.width === 0 || dimensions.height === 0) return
  const ctx = el.getContext('2d')
  if (ctx == null) return
  const { width, height } = dimensions
  const pixelRatio = window.devicePixelRatio
  el.width = Math.round(width * pixelRatio)
  el.height = Math.round(height * pixelRatio)
  ctx.scale(pixelRatio, pixelRatio)
  const { seed, started } = motion
  let frame = 0

  const draw = (now: number) => {
    const current = game.value
    const gameBlend = current == null ? 0 : reduced ? 1 : Math.min(1, (now - current.startedAt) / 240)
    const time = reduced ? 0 : ((current?.startedAt ?? now) - started) / 1000
    ctx.clearRect(0, 0, width, height)
    const grid = current == null ? gameGrid(width, height) : { ...current, ...gameLayout(current, width, height) }
    const spacing = gameCellSize * grid.scale
    for (let row = Math.ceil(-grid.y / spacing); grid.y + row * spacing < height; row++) {
      for (let column = Math.ceil(-grid.x / spacing); grid.x + column * spacing < width; column++) {
        const x = grid.x + column * spacing
        const y = grid.y + row * spacing
        const nx = x / width
        const ny = y / height
        // A single connected light field deforms continuously instead of splitting into competing patches.
        const phase = seed * Math.PI * 2
        const centerX = 0.5 + Math.sin(time * 0.75 + phase) * 0.24
        const centerY = 0.5 + Math.sin(time * 0.53 + phase * 0.7) * 0.2
        const dx = (nx - centerX + Math.sin(ny * 3 + time * 0.55) * 0.08) / 0.64
        const dy = (ny - centerY) / (0.58 + Math.sin(time * 0.4 + phase) * 0.05)
        const field = Math.exp(-2 * (dx * dx + dy * dy))
        const intensity = smooth(Math.max(0, Math.min(1, (field - 0.12) / 0.48)))
        const key = row * grid.columns + column
        const pellet =
          current != null &&
          column >= 0 &&
          column < grid.columns &&
          row >= 0 &&
          row < grid.rows &&
          current.pellets.has(key)
        const eatenAt = pellet ? current?.eaten.get(key) : null
        const opacity = eatenAt == null ? 1 : Math.max(0, 1 - (now - eatenAt) / 160)
        const loadingAlpha = reduced ? 0.45 : 0.04 + intensity * 0.96
        const gameAlpha = pellet ? 0.65 * opacity : 0
        ctx.fillStyle = uiVariables.color.primary.main
        ctx.globalAlpha = loadingAlpha + (gameAlpha - loadingAlpha) * gameBlend
        ctx.beginPath()
        ctx.arc(x, y, 1.7 * grid.scale, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (!reduced || game.value != null) frame = requestAnimationFrame(draw)
  }

  draw(performance.now())
  onCleanup(() => cancelAnimationFrame(frame))
})
</script>

<template>
  <Transition
    name="generation"
    :css="!reducedMotion"
    :duration="reducedMotion ? 0 : { enter: 0, leave: 500 }"
    @after-leave="emit('hidden')"
  >
    <div v-if="visible || celebrating" class="gen-loading" :class="{ cover }" role="status" aria-live="polite">
      <canvas ref="canvas" class="flow" aria-hidden="true"></canvas>
      <GenerationGame
        v-if="size != null && (playable || game != null)"
        :enabled="playable && visible"
        :completed="completed"
        :viewport="size"
        @change="game = $event"
      />
      <div v-if="($slots.default != null || game != null) && game?.status !== 'won'" class="message">
        <div class="min-w-0"><slot></slot></div>
        <div
          v-if="game?.status === 'playing'"
          class="flex shrink-0 items-center gap-2 tabular-nums"
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
  color: var(--ui-color-text);
  font-size: 12px;
  line-height: 18px;
  text-align: left;
}

.generation-leave-active {
  pointer-events: none;
  transition: opacity 500ms ease-in-out;
}

.generation-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .gen-loading {
    transition: none;
  }
}
</style>
