<script setup lang="ts">
import sampleSpriteUrl from '../ui-design/sample-sprite.svg'

defineProps<{
  width: number
  height: number
  running: boolean
}>()
</script>

<template>
  <div class="game-preview-scene relative overflow-hidden rounded-sm bg-primary-100">
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.75)_0_2%,transparent_2.4%),radial-gradient(circle_at_78%_28%,rgba(255,255,255,0.55)_0_1.4%,transparent_1.8%)] bg-size-[72px_72px]"
    ></div>
    <div class="absolute -bottom-[26%] -left-[10%] h-[58%] w-[72%] rounded-[50%] bg-primary-300/55"></div>
    <div class="absolute -right-[12%] -bottom-[32%] h-[62%] w-[76%] rounded-[50%] bg-primary-400/35"></div>
    <div
      class="absolute left-[12%] top-[15%] size-[10%] min-h-5 min-w-5 rounded-full bg-yellow-300 shadow-[0_0_0_8px_rgba(255,255,255,0.2)]"
    ></div>

    <div
      class="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-2xs text-grey-900 shadow-sm"
    >
      <span class="size-1.5 rounded-full bg-primary-500"></span>
      {{ width }} × {{ height }}
    </div>

    <div class="absolute right-[12%] top-[17%] flex flex-col items-center gap-1">
      <div class="h-8 w-1 rounded-full bg-grey-1000/45"></div>
      <div class="h-5 w-10 rounded-full border-2 border-white/80 bg-yellow-300/90"></div>
    </div>

    <img
      :src="sampleSpriteUrl"
      alt=""
      class="absolute left-[52%] top-[48%] h-auto w-[21%] min-w-12 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md"
    />

    <div
      v-if="running"
      class="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-grey-1000/75 px-3 py-1.5 text-2xs text-grey-100"
    >
      <span class="size-1.5 animate-pulse rounded-full bg-green-400"></span>
      {{ $t({ en: 'Game running', zh: '游戏运行中' }) }}
    </div>
  </div>
</template>

<style scoped>
.game-preview-scene {
  transition:
    width 240ms ease,
    height 240ms ease;
}
</style>
