<script lang="ts">
type GameSize = {
  width: number
  height: number
}

type Preset = GameSize & {
  id: 'classic' | 'wide' | 'portrait'
  label: { en: string; zh: string }
}

const presets: Preset[] = [
  { id: 'classic', label: { en: 'Original 4:3', zh: '原有 4:3' }, width: 480, height: 360 },
  { id: 'wide', label: { en: 'Wide example', zh: '横屏示例' }, width: 720, height: 405 },
  { id: 'portrait', label: { en: 'Portrait example', zh: '竖屏示例' }, width: 360, height: 640 }
]

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b)
}

function getFitStyle(viewportRatio: number, containerRatio: number) {
  if (viewportRatio >= containerRatio) {
    return {
      width: '100%',
      height: `${(containerRatio / viewportRatio) * 100}%`
    }
  }
  return {
    width: `${(viewportRatio / containerRatio) * 100}%`,
    height: '100%'
  }
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { UIButton, UICard, UICardHeader, UIIcon, UINumberInput, UITag, UITooltip } from '@/components/ui'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'
import { usePageTitle } from '@/utils/utils'
import GamePreviewScene from './GamePreviewScene.vue'

usePageTitle({ en: 'Game size adaptation demo', zh: '游戏尺寸适配演示' })

const gameWidth = ref(480)
const gameHeight = ref(360)
const widthInput = ref<number | null>(480)
const heightInput = ref<number | null>(360)
const settingsOpen = ref(false)
const running = ref(false)
const fullscreen = ref(false)
const sizeFeedbackVisible = ref(false)
const windowWidth = ref(1280)
const windowHeight = ref(720)
let feedbackTimer: number | null = null

const gameRatio = computed(() => gameWidth.value / gameHeight.value)
const ratioLabel = computed(() => {
  const divisor = greatestCommonDivisor(gameWidth.value, gameHeight.value)
  return `${gameWidth.value / divisor}:${gameHeight.value / divisor}`
})
const orientationLabel = computed(() => {
  if (gameWidth.value > gameHeight.value) return { en: 'Landscape', zh: '横屏' }
  if (gameWidth.value < gameHeight.value) return { en: 'Portrait', zh: '竖屏' }
  return { en: 'Square', zh: '方形' }
})
const selectedPresetId = computed(() => {
  return presets.find((preset) => preset.width === gameWidth.value && preset.height === gameHeight.value)?.id ?? null
})
const inlineViewportStyle = computed(() => getFitStyle(gameRatio.value, 4 / 3))
const fullscreenContainerRatio = computed(() => {
  const availableWidth = Math.max(windowWidth.value - 40, 1)
  const availableHeight = Math.max(windowHeight.value - 88, 1)
  return availableWidth / availableHeight
})
const fullscreenViewportStyle = computed(() => getFitStyle(gameRatio.value, fullscreenContainerRatio.value))

function showSizeFeedback() {
  sizeFeedbackVisible.value = true
  if (feedbackTimer != null) window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout(() => {
    sizeFeedbackVisible.value = false
    feedbackTimer = null
  }, 1800)
}

function applySize(width: number, height: number) {
  const changed = width !== gameWidth.value || height !== gameHeight.value
  gameWidth.value = width
  gameHeight.value = height
  widthInput.value = width
  heightInput.value = height
  if (changed) showSizeFeedback()
}

function applyPreset(preset: Preset) {
  applySize(preset.width, preset.height)
}

function handleWidthInput(value: number | null) {
  widthInput.value = value
  if (value != null && value > 0) applySize(value, gameHeight.value)
}

function handleHeightInput(value: number | null) {
  heightInput.value = value
  if (value != null && value > 0) applySize(gameWidth.value, value)
}

function handleFullscreenStop() {
  running.value = false
  fullscreen.value = false
}

function updateWindowSize() {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
}

onMounted(() => {
  updateWindowSize()
  window.addEventListener('resize', updateWindowSize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateWindowSize)
  if (feedbackTimer != null) window.clearTimeout(feedbackTimer)
})
</script>

<template>
  <section class="min-h-screen bg-grey-300 text-text">
    <NavbarWrapper>
      <template #left>
        <div class="ml-4 flex items-center gap-2 text-grey-800">
          <UIIcon type="file" />
          <span class="hidden text-xs desktop:inline">Issue #3452</span>
        </div>
      </template>
      <template #center>
        <div class="truncate text-title">
          {{ $t({ en: 'Game size adaptation · Live Demo', zh: '游戏尺寸适配 · Live Demo' }) }}
        </div>
      </template>
      <template #right>
        <UITag class="mr-3">{{ $t({ en: 'Design prototype', zh: '设计原型' }) }}</UITag>
      </template>
    </NavbarWrapper>

    <main class="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 pb-10 pt-2">
      <section
        class="flex flex-col gap-2 rounded-md border border-primary-300 bg-primary-100 px-4 py-3 desktop:flex-row desktop:items-center desktop:justify-between"
      >
        <div>
          <h1 class="text-title">
            {{ $t({ en: 'Try changing the game size', zh: '尝试修改游戏尺寸' }) }}
          </h1>
          <p class="mt-1 text-sm text-grey-900">
            {{
              $t({
                en: 'Open the size control in Preview. The panel stays fixed while the viewport adapts immediately.',
                zh: '从 Preview 打开尺寸设置。面板保持稳定，游戏预览视口立即适配。'
              })
            }}
          </p>
        </div>
        <div class="flex items-center gap-2 text-xs text-grey-900">
          <span class="rounded-full bg-grey-100 px-3 py-1.5">1 · {{ $t({ en: 'Set size', zh: '设定尺寸' }) }}</span>
          <UIIcon class="text-primary-500" type="arrowRightSmall" />
          <span class="rounded-full bg-grey-100 px-3 py-1.5"
            >2 · {{ $t({ en: 'Preview adapts', zh: '预览适配' }) }}</span
          >
          <UIIcon class="text-primary-500" type="arrowRightSmall" />
          <span class="rounded-full bg-grey-100 px-3 py-1.5">3 · {{ $t({ en: 'Run', zh: '运行' }) }}</span>
        </div>
      </section>

      <section
        class="min-h-[690px] overflow-auto rounded-lg border border-grey-400 bg-grey-300 shadow-md"
        data-testid="editor-shell"
      >
        <div class="flex min-w-[1000px] gap-xl p-4">
          <UICard class="min-w-0 flex-[1_1_0] flex flex-col">
            <div class="h-12 flex items-center gap-8 border-b border-grey-400 px-4">
              <button class="h-full border-b-2 border-grey-1000 px-1 text-title">Code</button>
              <button class="h-full px-1 text-grey-800">Costumes</button>
              <button class="h-full px-1 text-grey-800">Animations</button>
              <UIButton class="ml-auto" type="neutral">Format</UIButton>
            </div>
            <div class="flex min-h-[570px] flex-1">
              <aside class="w-56 flex-none border-r border-grey-400 p-4 text-sm text-grey-800">
                <div class="mb-4 flex items-center gap-2 text-title"><UIIcon type="timer" /> Game Events</div>
                <div class="mb-3 rounded-sm bg-grey-300 px-3 py-2">onStart =&gt; {}</div>
                <div class="mb-4 rounded-sm px-3 py-2">onClick =&gt; {}</div>
                <div class="mb-4 flex items-center gap-2 text-title"><UIIcon type="position" /> Motion</div>
                <div class="mb-3 rounded-sm px-3 py-2">step 100</div>
                <div class="rounded-sm px-3 py-2">turn Right</div>
              </aside>
              <div class="min-w-0 flex-1 p-6 font-mono text-sm/[26px]">
                <div>
                  <span class="mr-5 text-grey-600">1</span><span class="text-primary-700">onStart</span> =&gt; {
                </div>
                <div>
                  <span class="mr-5 text-grey-600">2</span>&nbsp;&nbsp;setBackdrop
                  <span class="text-green-700">"meadow"</span>
                </div>
                <div><span class="mr-5 text-grey-600">3</span>&nbsp;&nbsp;show</div>
                <div><span class="mr-5 text-grey-600">4</span>}</div>
                <div class="mt-4">
                  <span class="mr-5 text-grey-600">5</span><span class="text-primary-700">onClick</span> =&gt; {
                </div>
                <div><span class="mr-5 text-grey-600">6</span>&nbsp;&nbsp;glide 120, 40, 1</div>
                <div><span class="mr-5 text-grey-600">7</span>}</div>
              </div>
            </div>
          </UICard>

          <div class="relative min-w-0 flex-[0_0_496px] flex flex-col gap-xl">
            <UICard class="relative flex h-[426px] flex-col" data-testid="preview-panel">
              <UICardHeader class="gap-3">
                <div class="min-w-0 flex-1">
                  <div class="truncate text-title">
                    {{ running ? $t({ en: 'Running', zh: '运行中' }) : $t({ en: 'Preview', zh: '预览' }) }}
                  </div>
                  <div class="truncate text-2xs text-grey-700">
                    {{ gameWidth }} × {{ gameHeight }} · {{ ratioLabel }} · {{ $t(orientationLabel) }}
                  </div>
                </div>

                <UITooltip>
                  <template #trigger>
                    <UIButton
                      v-radar="{ name: 'Game size button', desc: 'Open controls for the game size' }"
                      aria-label="Set game size"
                      data-testid="size-settings-button"
                      type="neutral"
                      shape="square"
                      icon="setting"
                      @click="settingsOpen = !settingsOpen"
                    ></UIButton>
                  </template>
                  {{ $t({ en: 'Set game size', zh: '设定游戏尺寸' }) }}
                </UITooltip>

                <template v-if="!running">
                  <UIButton data-testid="run-button" icon="playHollow" @click="running = true">
                    {{ $t({ en: 'Run', zh: '运行' }) }}
                  </UIButton>
                </template>
                <template v-else>
                  <UIButton icon="rotate">{{ $t({ en: 'Rerun', zh: '重新运行' }) }}</UIButton>
                  <UIButton data-testid="stop-button" type="neutral" icon="end" @click="running = false">
                    {{ $t({ en: 'Stop', zh: '停止' }) }}
                  </UIButton>
                  <UITooltip>
                    <template #trigger>
                      <UIButton
                        aria-label="Enter full screen"
                        data-testid="fullscreen-button"
                        type="neutral"
                        shape="square"
                        icon="enterFullScreen"
                        @click="fullscreen = true"
                      ></UIButton>
                    </template>
                    {{ $t({ en: 'Enter full screen', zh: '进入全屏' }) }}
                  </UITooltip>
                </template>
              </UICardHeader>

              <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
                <div
                  class="relative h-full w-full flex items-center justify-center overflow-hidden rounded-sm bg-grey-300"
                  data-testid="preview-area"
                >
                  <GamePreviewScene
                    :width="gameWidth"
                    :height="gameHeight"
                    :running="running"
                    :style="inlineViewportStyle"
                    data-testid="game-viewport"
                  />

                  <div
                    v-if="sizeFeedbackVisible"
                    class="pointer-events-none absolute inset-x-0 top-3 flex justify-center"
                    aria-live="polite"
                    data-testid="size-feedback"
                  >
                    <div class="rounded-full bg-grey-1000/80 px-3 py-1.5 text-2xs text-grey-100 shadow-sm">
                      {{ $t({ en: 'Viewport updated', zh: '预览视口已更新' }) }} · {{ gameWidth }} × {{ gameHeight }}
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="settingsOpen"
                class="absolute right-3 top-[52px] z-10 w-[310px] rounded-md border border-grey-400 bg-grey-100 p-4 shadow-xl"
                data-testid="size-settings"
              >
                <div class="mb-1 flex items-center justify-between gap-3">
                  <div class="text-title">{{ $t({ en: 'Game size', zh: '游戏尺寸' }) }}</div>
                  <UITag>{{ $t(orientationLabel) }}</UITag>
                </div>
                <p class="mb-4 text-xs/[18px] text-grey-800">
                  {{
                    $t({
                      en: 'Controls the player-visible area. Orientation follows width and height, not a fixed ratio.',
                      zh: '决定玩家可见画面。横竖屏由宽高关系决定，不绑定固定比例。'
                    })
                  }}
                </p>

                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="preset in presets"
                    :key="preset.id"
                    v-radar="{
                      name: `${preset.label.en} size preset`,
                      desc: `Apply ${preset.width} by ${preset.height}`
                    }"
                    class="rounded-md border px-2 py-2 text-left transition-colors"
                    :class="
                      selectedPresetId === preset.id
                        ? 'border-primary-500 bg-primary-100 text-primary-700'
                        : 'border-grey-400 bg-grey-100 hover:bg-grey-300'
                    "
                    :data-testid="`preset-${preset.id}`"
                    @click="applyPreset(preset)"
                  >
                    <div class="truncate text-xs">{{ $t(preset.label) }}</div>
                    <div class="mt-1 text-2xs text-grey-700">{{ preset.width }} × {{ preset.height }}</div>
                  </button>
                </div>

                <div class="my-4 flex items-center gap-2 text-2xs text-grey-700">
                  <span class="h-px flex-1 bg-grey-400"></span>
                  {{ $t({ en: 'Custom', zh: '自定义' }) }}
                  <span class="h-px flex-1 bg-grey-400"></span>
                </div>

                <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <label class="flex flex-col gap-1 text-xs text-grey-800">
                    {{ $t({ en: 'Width', zh: '宽度' }) }}
                    <UINumberInput
                      aria-label="Game width"
                      data-testid="width-input"
                      :value="widthInput"
                      :min="1"
                      :max="4096"
                      @update:value="handleWidthInput"
                    />
                  </label>
                  <span class="pb-2 text-grey-600">×</span>
                  <label class="flex flex-col gap-1 text-xs text-grey-800">
                    {{ $t({ en: 'Height', zh: '高度' }) }}
                    <UINumberInput
                      aria-label="Game height"
                      data-testid="height-input"
                      :value="heightInput"
                      :min="1"
                      :max="4096"
                      @update:value="handleHeightInput"
                    />
                  </label>
                </div>

                <div class="mt-4 flex items-center justify-between gap-3">
                  <div class="text-2xs text-grey-700">
                    {{ $t({ en: 'Preview updates immediately', zh: '预览即时更新' }) }}
                  </div>
                  <UIButton type="neutral" @click="settingsOpen = false">
                    {{ $t({ en: 'Done', zh: '完成' }) }}
                  </UIButton>
                </div>
              </div>
            </UICard>

            <div class="grid h-[190px] grid-cols-[1fr_150px] gap-xl">
              <UICard class="p-4">
                <div class="mb-4 flex items-center justify-between text-title">
                  Sprites
                  <UIIcon type="plus" />
                </div>
                <div class="flex gap-3">
                  <div
                    class="flex h-20 w-20 items-center justify-center rounded-md border-2 border-primary-500 bg-primary-100 text-3xl"
                  >
                    🤖
                  </div>
                  <div
                    class="flex h-20 w-20 items-center justify-center rounded-md border border-grey-400 bg-grey-100 text-3xl"
                  >
                    🌼
                  </div>
                </div>
              </UICard>
              <UICard class="p-4">
                <div class="mb-4 text-title">Stage</div>
                <div class="rounded-md border border-grey-400 bg-primary-100 p-3 text-center text-xs text-grey-800">
                  {{ $t({ en: 'World', zh: '世界' }) }}
                  <div class="mt-1 text-2xs">1200 × 900</div>
                </div>
              </UICard>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-3 desktop:grid-cols-3" aria-label="Concept boundaries">
        <UICard class="p-4">
          <div class="mb-2 flex items-center gap-2 text-title">
            <span class="flex size-6 items-center justify-center rounded-full bg-primary-100 text-primary-600">1</span
            >{{ $t({ en: 'Game size', zh: '游戏尺寸' }) }}
          </div>
          <p class="text-sm/[21px] text-grey-800">
            {{
              $t({
                en: 'Defines the aspect ratio and visible area presented to the player.',
                zh: '决定玩家看到的画面比例和可见范围。'
              })
            }}
          </p>
        </UICard>
        <UICard class="p-4">
          <div class="mb-2 flex items-center gap-2 text-title">
            <span class="flex size-6 items-center justify-center rounded-full bg-primary-100 text-primary-600">2</span
            >{{ $t({ en: 'Preview viewport', zh: '游戏预览视口' }) }}
          </div>
          <p class="text-sm/[21px] text-grey-800">
            {{
              $t({
                en: 'Scales the full game frame proportionally inside the stable Preview panel.',
                zh: '在稳定的 Preview 面板内等比例展示完整游戏画面。'
              })
            }}
          </p>
        </UICard>
        <UICard class="p-4">
          <div class="mb-2 flex items-center gap-2 text-title">
            <span class="flex size-6 items-center justify-center rounded-full bg-primary-100 text-primary-600">3</span
            >{{ $t({ en: 'Map / world size', zh: '地图 / 世界尺寸' }) }}
          </div>
          <p class="text-sm/[21px] text-grey-800">
            {{
              $t({
                en: 'Describes the complete world and may be larger than the visible game area.',
                zh: '描述完整游戏世界，可以大于玩家当前看到的画面。'
              })
            }}
          </p>
        </UICard>
      </section>

      <p class="text-center text-xs text-grey-700">
        {{
          $t({
            en: 'Design validation only — no project format, persistence, or runtime implementation is defined here.',
            zh: '仅用于产品设计验证——不定义项目格式、数据存储或运行引擎实现。'
          })
        }}
      </p>
    </main>

    <div v-if="fullscreen" class="fixed inset-0 z-[100] flex flex-col bg-grey-100" data-testid="fullscreen-view">
      <header class="h-12 flex flex-none items-center gap-3 border-b border-grey-400 px-4">
        <div class="flex-[1_1_30%]"></div>
        <div class="flex-[1_1_40%] truncate text-center text-title">
          {{ $t({ en: 'Game size adaptation demo', zh: '游戏尺寸适配演示' }) }}
        </div>
        <div class="flex-[1_1_30%] items-center justify-end gap-3 flex">
          <UIButton icon="rotate">{{ $t({ en: 'Rerun', zh: '重新运行' }) }}</UIButton>
          <UIButton type="neutral" icon="end" @click="handleFullscreenStop">
            {{ $t({ en: 'Stop', zh: '停止' }) }}
          </UIButton>
          <UITooltip>
            <template #trigger>
              <UIButton
                aria-label="Exit full screen"
                data-testid="exit-fullscreen-button"
                type="neutral"
                shape="square"
                icon="exitFullScreen"
                @click="fullscreen = false"
              ></UIButton>
            </template>
            {{ $t({ en: 'Exit full screen', zh: '退出全屏' }) }}
          </UITooltip>
        </div>
      </header>
      <div class="flex min-h-0 flex-1 items-center justify-center bg-grey-300 p-5" data-testid="fullscreen-area">
        <GamePreviewScene
          :width="gameWidth"
          :height="gameHeight"
          :running="running"
          :style="fullscreenViewportStyle"
          data-testid="fullscreen-viewport"
        />
      </div>
    </div>
  </section>
</template>
