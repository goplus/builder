<script setup lang="ts">
import { ref } from 'vue'
import { usePageTitle } from '@/utils/utils'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import type { FramesConfig } from '@/models/spx/gen/animation-gen'
import AnimationVideoPreview from '@/components/asset/gen/animation/AnimationVideoPreview.vue'
import PreviewWithCheckerboardBg from '@/components/asset/gen/common/PreviewWithCheckerboardBg.vue'
import { UIButton, UITag } from '@/components/ui'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityFooter from '@/components/community/footer/CommunityFooter.vue'

usePageTitle([
  {
    en: 'Animation Preview Playground',
    zh: '动画预览调试页'
  },
  {
    en: 'Documentation',
    zh: '文档'
  }
])

const demoVideoUrl = 'https://xbuilder-usercontent-test.gopluscdn.com/aigc/Fmpfv5xEzs33eZKw0oTR66H_f_ta-1442186.mp4'
const demoVideo = createFileWithUniversalUrl(demoVideoUrl, 'animation-preview-demo.mp4')

const framesConfig = ref<FramesConfig | null>(null)
const configHistory = ref<FramesConfig[]>([])
const previewInstanceKey = ref(0)

function handleFramesConfigUpdate(next: FramesConfig) {
  const snapshot = { ...next }
  framesConfig.value = snapshot
  configHistory.value = [snapshot, ...configHistory.value].slice(0, 8)
}

function handleRemountPreview() {
  framesConfig.value = null
  configHistory.value = []
  previewInstanceKey.value += 1
}

function handleClearHistory() {
  configHistory.value = []
}

function formatFramesConfig(config: FramesConfig | null) {
  return JSON.stringify(config, null, 2)
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-y-auto bg-grey-100">
    <CommunityNavbar />

    <CenteredWrapper size="large" class="my-7.5 flex flex-col gap-6">
      <header
        class="rounded-lg bg-[radial-gradient(circle_at_top_right,rgba(64,195,211,0.14),transparent_30%),linear-gradient(180deg,#fff_0%,#f8fcfd_100%)] px-7 py-6 shadow-[inset_0_0_0_1px_rgba(226,234,238,0.95)]"
      >
        <div class="flex flex-col gap-3 desktop:flex-row desktop:items-start desktop:justify-between">
          <div class="max-w-190">
            <h1 class="text-[28px]/9 text-grey-1000">
              {{ $t({ en: 'Animation Preview Playground', zh: '动画预览调试页' }) }}
            </h1>
            <p class="mt-1.5 text-sm/5.5 text-grey-800">
              {{
                $t({
                  en: 'A local page for testing the crop handles and playback progress of AnimationVideoPreview with a fixed demo video.',
                  zh: '一个本地调试页，用固定演示视频测试 AnimationVideoPreview 的裁剪滑块和播放进度表现。'
                })
              }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UIButton
              v-radar="{
                name: 'Remount animation preview',
                desc: 'Remount the animation preview playground component'
              }"
              type="white"
              @click="handleRemountPreview"
            >
              {{ $t({ en: 'Remount preview', zh: '重新挂载预览' }) }}
            </UIButton>
            <UIButton
              v-radar="{
                name: 'Clear animation preview history',
                desc: 'Clear emitted frames config history in the animation preview playground'
              }"
              type="white"
              @click="handleClearHistory"
            >
              {{ $t({ en: 'Clear history', zh: '清空历史' }) }}
            </UIButton>
          </div>
        </div>
      </header>

      <section class="grid gap-6 desktop:grid-cols-[minmax(0,2.2fr)_minmax(320px,1fr)]">
        <div class="rounded-lg bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,234,238,0.95)]">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-2xl text-grey-1000">AnimationVideoPreview</h2>
            <UITag color="primary">demo</UITag>
          </div>

          <PreviewWithCheckerboardBg class="h-150">
            <AnimationVideoPreview
              :key="previewInstanceKey"
              :video="demoVideo"
              :frames-config="framesConfig"
              @update:frames-config="handleFramesConfigUpdate"
            />
          </PreviewWithCheckerboardBg>
        </div>

        <div class="flex flex-col gap-4">
          <section class="rounded-lg bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,234,238,0.95)]">
            <h2 class="text-2xl text-grey-1000">{{ $t({ en: 'Debug info', zh: '调试信息' }) }}</h2>
            <dl class="mt-4 flex flex-col gap-3 text-sm/5.5 text-grey-900">
              <div>
                <dt class="text-xs text-grey-700">{{ $t({ en: 'Video URL', zh: '视频地址' }) }}</dt>
                <dd class="mt-1 break-all font-mono text-xs/5">{{ demoVideoUrl }}</dd>
              </div>
              <div>
                <dt class="text-xs text-grey-700">{{ $t({ en: 'Latest framesConfig', zh: '最新 framesConfig' }) }}</dt>
                <dd class="mt-1 overflow-x-auto rounded-md bg-grey-100 p-3 font-mono text-xs/5 whitespace-pre-wrap">
                  {{ formatFramesConfig(framesConfig) }}
                </dd>
              </div>
            </dl>
          </section>

          <section class="rounded-lg bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,234,238,0.95)]">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-2xl text-grey-1000">{{ $t({ en: 'Update history', zh: '更新历史' }) }}</h2>
              <UITag color="default">{{ configHistory.length }}</UITag>
            </div>

            <ol v-if="configHistory.length > 0" class="mt-4 flex flex-col gap-3">
              <li
                v-for="(item, index) in configHistory"
                :key="`${index}-${item.startTime}-${item.duration}-${item.interval}`"
              >
                <div class="rounded-md bg-grey-100 p-3 font-mono text-xs/5 text-grey-900 whitespace-pre-wrap">
                  {{ formatFramesConfig(item) }}
                </div>
              </li>
            </ol>
            <div v-else class="mt-4 rounded-md bg-grey-100 p-4 text-sm/5.5 text-grey-700">
              {{
                $t({
                  en: 'No updates yet. Once the video is ready, the component will emit an initial framesConfig. Dragging the markers will append more records here.',
                  zh: '当前还没有更新记录。视频加载完成后组件会先发出一次初始 framesConfig，之后拖动滑块会继续在这里追加记录。'
                })
              }}
            </div>
          </section>
        </div>
      </section>
    </CenteredWrapper>

    <CommunityFooter />
  </div>
</template>
