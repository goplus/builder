<script lang="ts">
const DOT_SPACING = 12
const DOT_INSET = 16
const DOT_RADIUS = 1.2

function smooth(value: number) {
  return value * value * (3 - 2 * value)
}
</script>

<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue'
import { useContentSize } from '@/utils/dom'
import { useUIVariables } from '@/components/ui'

withDefaults(
  defineProps<{
    visible?: boolean
  }>(),
  {
    visible: true
  }
)

const motionQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null
const reducedMotion = ref(motionQuery?.matches ?? false)

if (motionQuery != null) {
  const updateMotion = () => {
    reducedMotion.value = motionQuery.matches
  }
  motionQuery.addEventListener('change', updateMotion)
  onScopeDispose(() => motionQuery.removeEventListener('change', updateMotion))
}

const canvas = ref<HTMLCanvasElement | null>(null)
const size = useContentSize(canvas)
const uiVariables = useUIVariables()

watch([canvas, size, reducedMotion], ([el, dimensions, reduced], _, onCleanup) => {
  if (el == null || dimensions == null || dimensions.width === 0 || dimensions.height === 0) return
  const ctx = el.getContext('2d')
  if (ctx == null) return

  const { width, height } = dimensions
  const pixelRatio = window.devicePixelRatio || 1
  el.width = Math.round(width * pixelRatio)
  el.height = Math.round(height * pixelRatio)
  ctx.scale(pixelRatio, pixelRatio)

  const columns = Math.max(1, Math.floor((width - DOT_INSET) / DOT_SPACING) + 1)
  const rows = Math.max(1, Math.floor((height - DOT_INSET) / DOT_SPACING) + 1)
  const gridX = (width - (columns - 1) * DOT_SPACING) / 2
  const gridY = (height - (rows - 1) * DOT_SPACING) / 2
  let frame = 0

  const draw = (now: number) => {
    const time = reduced ? 0 : now / 1000
    ctx.clearRect(0, 0, width, height)

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const x = gridX + column * DOT_SPACING
        const y = gridY + row * DOT_SPACING
        const nx = x / width
        const ny = y / height
        // Match GenLoading compact mode (#3632): a single connected light field deforming continuously.
        const centerX = 0.5 + Math.sin(time * 0.75) * 0.24
        const centerY = 0.5 + Math.sin(time * 0.53) * 0.2
        const dx = (nx - centerX + Math.sin(ny * 3 + time * 0.55) * 0.08) / 0.64
        const dy = (ny - centerY) / (0.58 + Math.sin(time * 0.4) * 0.05)
        const field = Math.exp(-2 * (dx * dx + dy * dy))
        const intensity = smooth(Math.max(0, Math.min(1, (field - 0.12) / 0.48)))

        ctx.fillStyle = uiVariables.color.primary.main
        ctx.globalAlpha = reduced ? 0.45 : 0.04 + intensity * 0.96
        ctx.beginPath()
        ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (!reduced) frame = requestAnimationFrame(draw)
  }

  draw(performance.now())
  onCleanup(() => cancelAnimationFrame(frame))
})
</script>

<template>
  <Transition name="sound-dot-loading" :css="!reducedMotion" :duration="reducedMotion ? 0 : { enter: 0, leave: 500 }">
    <div
      v-if="visible"
      class="sound-dot-loading absolute inset-0 z-20 overflow-hidden rounded-[inherit] bg-grey-200"
      role="status"
      aria-live="polite"
    >
      <canvas ref="canvas" class="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true"></canvas>
    </div>
  </Transition>
</template>

<style scoped>
.sound-dot-loading-leave-active {
  pointer-events: none;
  transition: opacity 500ms ease-in-out;
}

.sound-dot-loading-leave-to {
  opacity: 0;
}
</style>
