<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, type CSSProperties } from 'vue'
import { type LocaleMessage, useI18n } from '@/utils/i18n'
import { useSpotlight } from '@/utils/spotlight'
import { usePageTitle } from '@/utils/utils'
import { UIButton, useRootContainer } from '@/components/ui'
import { useCopilot } from '@/components/copilot/context'
import CommunityNavbar from '@/components/community/CommunityNavbar.vue'
import CenteredWrapper from '@/components/common/CenteredWrapper.vue'

usePageTitle({ en: 'Spotlight design', zh: 'Spotlight 设计' })

const center = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
const cases: { name: LocaleMessage; description: LocaleMessage; style: CSSProperties; scroll?: boolean }[] = [
  {
    name: { en: 'Centered button', zh: '中央按钮' },
    description: {
      en: 'With enough space, the arrow sits outside the target’s lower-right corner.',
      zh: '空间充足时，箭头在目标右下角外侧。'
    },
    style: center
  },
  {
    name: { en: 'Top-left corner', zh: '左上角' },
    description: {
      en: 'The tip stays fully visible when the target is near the top-left corner.',
      zh: '目标靠近左上角，提示应完整显示。'
    },
    style: { left: '8px', top: '8px' }
  },
  {
    name: { en: 'Top-right corner', zh: '右上角' },
    description: {
      en: 'The tip moves to the left when there is not enough space on the right.',
      zh: '右侧空间不足时切换到左侧。'
    },
    style: { right: '8px', top: '8px' }
  },
  {
    name: { en: 'Bottom-left corner', zh: '左下角' },
    description: {
      en: 'The tip moves above the target when there is not enough space below.',
      zh: '下方空间不足时切换到上方。'
    },
    style: { left: '8px', bottom: '8px' }
  },
  {
    name: { en: 'Bottom-right corner', zh: '右下角' },
    description: { en: 'The tip moves to the target’s upper-left corner.', zh: '同时切换到目标左上方。' },
    style: { right: '8px', bottom: '8px' }
  },
  {
    name: { en: 'Bottom overflow regression', zh: '底部溢出回归' },
    description: {
      en: 'With only 62px below the target, even a short tip should appear above it without being cut off.',
      zh: '目标下方仅剩 62px：短提示也应放到上方，不能被屏幕底部截断。'
    },
    style: { left: '40%', bottom: '62px' }
  },
  {
    name: { en: 'Near the top edge', zh: '贴近顶部' },
    description: { en: 'The tip stays below the top edge.', zh: '气泡不应超出顶部。' },
    style: { left: '50%', top: '8px' }
  },
  {
    name: { en: 'Near the bottom edge', zh: '贴近底部' },
    description: { en: 'The tip stays above the bottom edge.', zh: '气泡不应超出底部。' },
    style: { left: '50%', bottom: '8px' }
  },
  {
    name: { en: 'Near the left edge', zh: '贴近左侧' },
    description: { en: 'Both the tip and arrow stay inside the viewport.', zh: '气泡与箭头都应留在视口内。' },
    style: { left: '8px', top: '50%' }
  },
  {
    name: { en: 'Near the right edge', zh: '贴近右侧' },
    description: { en: 'Both the tip and arrow stay inside the viewport.', zh: '气泡与箭头都应留在视口内。' },
    style: { right: '8px', top: '50%' }
  },
  {
    name: { en: 'Wide target', zh: '宽目标' },
    description: {
      en: 'Check the adjusted tip and arrow positions with a target that spans the screen.',
      zh: '横跨屏幕的目标，检查位置修正后的气泡和箭头。'
    },
    style: { left: '24px', right: '24px', top: '50%', width: 'auto', height: '64px' }
  },
  {
    name: { en: 'Tall target', zh: '高目标' },
    description: {
      en: 'The tip stays fully visible when vertical space is limited.',
      zh: '纵向空间不足时，提示仍应完整显示。'
    },
    style: { top: '24px', bottom: '24px', left: '50%', width: '80px', height: 'auto' }
  },
  {
    name: { en: 'Large target', zh: '大目标' },
    description: {
      en: 'When no side has enough space, the tip shifts into the viewport even if the preferred gap cannot be kept.',
      zh: '四周均放不下时，提示会移入视口，间距允许让步。'
    },
    style: { inset: '24px', width: 'auto', height: 'auto' }
  },
  {
    name: { en: 'Small target', zh: '小目标' },
    description: { en: 'The cutout keeps its padding around a 16×16px target.', zh: '16×16px 的目标仍保留挖孔留白。' },
    style: { ...center, width: '16px', height: '16px' }
  },
  {
    name: { en: 'Resizable target', zh: '调整目标尺寸' },
    description: {
      en: 'Drag the target’s lower-right corner to resize it and check that the cutout and tip follow.',
      zh: '拖动目标右下角调整尺寸，检查挖孔与提示是否跟随。'
    },
    style: { left: '35%', top: '45%', width: '160px', height: '100px', resize: 'both', overflow: 'auto' }
  },
  {
    name: { en: 'Scrolling target', zh: '滚动目标' },
    description: {
      en: 'Scroll slightly inside the container and check that the cutout and tip follow the target while it remains visible.',
      zh: '在容器内小幅滚动，检查挖孔和提示是否跟随仍可见的目标。'
    },
    style: { left: '40%', top: '200px', width: '120px' },
    scroll: true
  }
]

const i18n = useI18n()
const spotlight = useSpotlight()
const rootContainer = useRootContainer()
const copilot = useCopilot()
onMounted(() => copilot.disableGlobalUI())
const selected = ref<number | null>(null)
const targetRef = ref<HTMLElement | null>(null)
const mask = ref(true)
const longTip = ref(false)
const clickCount = ref(0)
const backgroundClickCount = ref(0)
const currentCase = computed(() => (selected.value == null ? null : cases[selected.value]))

function reveal() {
  if (targetRef.value == null) return
  const tip = longTip.value
    ? i18n
        .t({
          en: 'This is a long Spotlight tip for checking line wrapping and viewport boundaries. Check that the arrow and tip stay fully visible and the text does not extend beyond the screen. ',
          zh: '这是一段较长的 Spotlight 提示，用来检查自动换行和边界处理。请确认箭头与提示气泡完整显示，文字不会超出屏幕。'
        })
        .repeat(12)
    : i18n.t({ en: 'Say something to Copilot', zh: '向 Copilot 说句话' })
  spotlight.reveal(targetRef.value, { tip, mask: mask.value, duration: 0 })
}

async function showCase(index: number) {
  spotlight.conceal()
  selected.value = (index + cases.length) % cases.length
  clickCount.value = 0
  backgroundClickCount.value = 0
  await nextTick()
  reveal()
}

function close() {
  spotlight.conceal()
  selected.value = null
}

onBeforeUnmount(() => {
  copilot.enableGlobalUI()
  if (selected.value != null) spotlight.conceal()
})
</script>

<template>
  <div class="min-h-screen bg-grey-300 text-text">
    <CommunityNavbar />
    <CenteredWrapper class="py-6">
      <RouterLink to="/docs/ui-design" class="text-primary-main"
        >← {{ $t({ en: 'UI Design', zh: 'UI 设计' }) }}</RouterLink
      >
      <h1 class="mt-4 text-2xl font-semibold">Spotlight</h1>
      <p class="mt-3 max-w-3xl">
        {{
          $t({
            en: 'Spotlight draws attention to an interface element with a dimmed background, a cutout, and an arrow with a tip. Preview its appearance and interaction across different layouts.',
            zh: 'Spotlight 通过背景遮罩、挖孔和带箭头的提示突出界面元素。这里可以预览不同布局下的外观和交互。'
          })
        }}
      </p>
      <ul class="mt-3 list-disc pl-5 text-sm leading-7">
        <li>
          {{
            $t({
              en: 'The cutout keeps 6px of padding with 8px corners.',
              zh: '挖孔保留 6px 留白，使用 8px 圆角。'
            })
          }}
        </li>
        <li>
          {{
            $t({
              en: 'The arrow prefers the lower-right corner with a 16px gap. When space is limited, the tip changes sides or shifts to remain visible.',
              zh: '箭头优先位于目标右下角外侧，锚点距目标 16px。空间不足时切换方向或调整位置，优先完整显示。'
            })
          }}
        </li>
        <li>
          {{
            $t({
              en: 'The target stays clickable, and the cutout follows scrolling and resizing. Clicking the dimmed area dismisses the spotlight without activating the element underneath.',
              zh: '目标保持可点击，挖孔随滚动和尺寸变化跟随。点击遮罩区域会关闭高亮，不会触发下方元素。'
            })
          }}
        </li>
        <li>
          {{
            $t({
              en: 'Without a mask, the whole page stays interactive. Closing the spotlight restores interaction immediately while the mask fades out.',
              zh: '不显示遮罩时，整个页面保持可交互。关闭高亮时立即恢复交互，遮罩继续淡出。'
            })
          }}
        </li>
      </ul>
      <h2 class="mt-6 text-xl font-semibold">{{ $t({ en: 'Interactive examples', zh: '交互示例' }) }}</h2>
      <p class="mt-3 max-w-3xl">
        {{
          $t({
            en: 'Choose a case to open a full-screen preview. Toggle long tips and the mask, and resize the browser window. With enough space, the arrow sits outside the target’s lower-right corner; when space is limited, keeping the arrow and tip fully visible takes priority.',
            zh: '选择一个场景进入全屏预览。可切换长提示、遮罩，并调整浏览器窗口大小。空间充足时，箭头位于目标右下角外侧；空间不足时优先保证箭头和气泡完整可见。'
          })
        }}
      </p>
      <div class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        <button
          v-for="(item, index) in cases"
          :key="item.name.en"
          v-radar="{ name: 'spotlight-case', attrs: { name: item.name.en }, desc: item.description.en }"
          class="rounded-lg border border-grey-400 bg-grey-100 p-4 text-left cursor-pointer"
          @click="showCase(index)"
        >
          <h2 class="font-semibold">{{ index + 1 }}. {{ $t(item.name) }}</h2>
          <p class="mt-2 text-sm text-grey-700">{{ $t(item.description) }}</p>
        </button>
      </div>
    </CenteredWrapper>
    <Teleport :to="rootContainer">
      <section
        v-if="currentCase != null"
        v-radar="{ name: 'spotlight-preview', attrs: { name: currentCase.name.en }, desc: currentCase.description.en }"
        role="dialog"
        aria-modal="true"
        class="fixed inset-0 z-[5000] bg-grey-300 text-text"
        @keydown.esc="close"
      >
        <div class="relative z-10 h-full">
          <div :key="selected ?? -1" :class="currentCase.scroll ? 'scroll-area' : 'absolute inset-0'">
            <div :class="currentCase.scroll ? 'relative h-[600px]' : 'absolute inset-0'">
              <div
                ref="targetRef"
                v-radar="{ name: 'spotlight-test-target', desc: currentCase.description.en }"
                class="absolute h-[50px] w-[50px] rounded-xl border-2 border-primary-main bg-grey-100 shadow-sm"
                :style="currentCase.style"
              >
                <button
                  v-radar="{ name: 'spotlight-target-action', desc: 'Check that the highlighted target is clickable' }"
                  class="h-full w-full cursor-pointer text-primary-main font-bold"
                  @click="clickCount++"
                >
                  C
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          class="fixed left-1/2 top-24 z-20 w-[min(600px,calc(100vw-32px))] -translate-x-1/2 rounded-xl bg-grey-100 p-4 shadow-lg"
        >
          <h2 class="font-semibold">{{ (selected ?? 0) + 1 }}/{{ cases.length }} · {{ $t(currentCase.name) }}</h2>
          <p class="mt-2 text-sm">{{ $t(currentCase.description) }}</p>
          <div class="mt-3 flex flex-wrap gap-3">
            <UIButton
              v-radar="{ name: 'spotlight-previous', desc: 'Previous case' }"
              @click="showCase((selected ?? 0) - 1)"
              >{{ $t({ en: 'Previous', zh: '上一项' }) }}</UIButton
            >
            <UIButton v-radar="{ name: 'spotlight-next', desc: 'Next case' }" @click="showCase((selected ?? 0) + 1)">{{
              $t({ en: 'Next', zh: '下一项' })
            }}</UIButton>
            <UIButton v-radar="{ name: 'spotlight-reveal', desc: 'Show the spotlight again' }" @click="reveal">{{
              $t({ en: 'Show again', zh: '重新显示' })
            }}</UIButton>
            <UIButton
              v-radar="{ name: 'spotlight-conceal', desc: 'Hide the spotlight' }"
              @click="spotlight.conceal()"
              >{{ $t({ en: 'Hide', zh: '隐藏' }) }}</UIButton
            >
            <UIButton v-radar="{ name: 'spotlight-close', desc: 'Return to the case list' }" @click="close">{{
              $t({ en: 'Back to list', zh: '返回列表' })
            }}</UIButton>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <label
              ><input
                v-model="mask"
                v-radar="{ name: 'spotlight-mask-toggle', desc: 'Toggle the dimmed background mask' }"
                type="checkbox"
                @change="reveal"
              />
              {{ $t({ en: 'Mask', zh: '遮罩' }) }}</label
            >
            <label
              ><input
                v-model="longTip"
                v-radar="{
                  name: 'spotlight-long-tip-toggle',
                  desc: 'Toggle a long tip to preview wrapping and scrolling'
                }"
                type="checkbox"
                @change="reveal"
              />
              {{ $t({ en: 'Long tip', zh: '长提示' }) }}</label
            >
            <span>{{ $t({ en: 'Target clicks:', zh: '目标点击次数：' }) }} {{ clickCount }}</span>
          </div>
          <p class="mt-2 text-xs text-grey-700">
            {{
              $t({
                en: 'Clicking the mask only dismisses the spotlight; the controls become available afterward. When the background button is covered by the mask, the first click does not increase its counter, but the next click does. Without a mask, clicks increase the counter immediately. Long tips can be scrolled.',
                zh: '点击遮罩只关闭高亮，关闭后可使用控制面板。背景按钮被遮罩覆盖时，第一次点击不增加计数，再次点击才增加；无遮罩时直接增加。长提示可滚动阅读。'
              })
            }}
          </p>
        </div>
        <div class="fixed right-6 bottom-24 z-20 rounded-xl bg-grey-100 p-3 shadow-lg">
          <UIButton
            v-radar="{ name: 'spotlight-background-action', desc: 'Check that the mask blocks the button underneath' }"
            @click="backgroundClickCount++"
            >{{ $t({ en: 'Background button · Clicks:', zh: '背景按钮 · 点击次数：' }) }}
            {{ backgroundClickCount }}</UIButton
          >
        </div>
      </section>
    </Teleport>
  </div>
</template>

<style scoped>
.scroll-area {
  position: absolute;
  left: 20%;
  top: 45%;
  width: 60%;
  height: 240px;
  max-height: 40vh;
  overflow: auto;
  resize: both;
  border: 1px solid var(--ui-color-grey-500);
  border-radius: 12px;
  background: var(--ui-color-grey-100);
}
</style>
