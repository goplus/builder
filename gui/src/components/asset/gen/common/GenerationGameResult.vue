<script setup lang="ts">
import { onMounted, onScopeDispose, ref } from 'vue'
import { useUIVariables } from '@/components/ui'

defineProps<{ score: number }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const ui = useUIVariables()
let frame = 0

onMounted(() => {
  const el = canvas.value
  if (el == null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const ctx = el.getContext('2d')
  if (ctx == null) return
  const { width, height } = el.getBoundingClientRect()
  const ratio = window.devicePixelRatio
  el.width = width * ratio
  el.height = height * ratio
  ctx.scale(ratio, ratio)
  // Two short side bursts, inspired by Magic UI's Confetti side cannons.
  const colors = [ui.color.primary.main, ui.color.primary[300], ui.color.yellow.main]
  const particles = Array.from({ length: 64 }, (_, i) => {
    const side = i % 2 === 0 ? 1 : -1
    return {
      x: side === 1 ? width * 0.12 : width * 0.88,
      y: height * 0.65,
      vx: side * (60 + Math.random() * 150),
      vy: -120 - Math.random() * 180,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 12,
      size: 3 + Math.random() * 3,
      color: colors[i % colors.length]
    }
  })
  const started = performance.now()
  const draw = (now: number) => {
    const time = (now - started) / 1000
    ctx.clearRect(0, 0, width, height)
    ctx.globalAlpha = Math.min(1, Math.max(0, (1.6 - time) / 0.5))
    for (const p of particles) {
      ctx.save()
      ctx.translate(p.x + (p.vx * (1 - Math.exp(-time * 2))) / 2, p.y + p.vy * time + 150 * time * time)
      ctx.rotate(p.angle + p.spin * time)
      ctx.scale(1, Math.cos(p.angle + time * 9))
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65)
      ctx.restore()
    }
    if (time < 1.6) frame = requestAnimationFrame(draw)
  }
  frame = requestAnimationFrame(draw)
})
onScopeDispose(() => cancelAnimationFrame(frame))
</script>

<template>
  <div class="game-result absolute inset-0 flex items-center justify-center pointer-events-auto">
    <div class="result-backdrop absolute inset-0" aria-hidden="true"></div>
    <canvas ref="canvas" class="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />
    <div
      class="result-content relative flex flex-col items-center text-center"
      role="status"
      :aria-label="$t({ en: `You made it! Score: ${score}`, zh: `挑战成功，得分 ${score}` })"
    >
      <strong class="result-title font-semibold text-title" aria-hidden="true">
        {{ $t({ en: 'Complete', zh: '通关' }) }}
      </strong>
      <div class="result-score flex flex-col items-center gap-2" aria-hidden="true">
        <span class="score-value font-semibold tabular-nums text-primary-main">{{ score }}</span>
        <span class="text-base text-grey-900">{{ $t({ en: 'Score', zh: '得分' }) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-result {
  container-type: inline-size;
}
.result-backdrop {
  background: var(--ui-color-grey-200);
  animation: backdrop-in 300ms 160ms ease-out both;
}
.result-title {
  font-size: clamp(28px, 6cqi, 40px);
  line-height: 1.2;
  animation: result-in 360ms 240ms cubic-bezier(0.2, 0, 0, 1) both;
}
.result-score {
  margin-top: 20px;
  animation: result-in 400ms 340ms cubic-bezier(0.2, 0, 0, 1) both;
}
.score-value {
  font-size: clamp(48px, 12cqi, 80px);
  line-height: 1;
  letter-spacing: -0.04em;
}
@keyframes backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.96;
  }
}
@keyframes result-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .result-backdrop {
    animation: none;
    opacity: 0.96;
  }
  .result-title,
  .result-score {
    animation: none;
  }
}
</style>
