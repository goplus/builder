<template>
  <div class="step-player">
    <MaskWithHighlight :visible="true" :highlight-element-path="props.step.target">
      <template v-if="props.step.type === 'coding'">
        <div class="code-button-container">
          <button @click="handleCheckButtonClick">Check</button>
          <button>Info</button>
          <button>Answer</button>
        </div>
      </template>
      <template v-if="props.step.type === 'following'" #defulat="{ slotInfo }">
        <div class="guide-ui-container">
          <img
            class="niuxiaoqi"
            :style="getNiuxiaoqiStyle(slotInfo.highlightRect)"
            width="300"
            height="320"
            src="https://www-static.qbox.me/sem/pili-live-1001/source/img/qiniu.png"
          />
          <svg
            class="ic-bubble"
            :style="getBubbleStyle(slotInfo.highlightRect)"
            viewBox="0 0 1024 1024"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            p-id="1444"
            data-spm-anchor-id="a313x.search_index.0.i0.6e8f3a81bBVDWW"
            width="300"
            height="200"
          >
            <path
              d="M149.333333 896a21.333333 21.333333 0 0 1-15.086666-36.42L823.166667 170.666667H661.333333a21.333333 21.333333 0 0 1 0-42.666667h213.46a21.333333 21.333333 0 0 1 21.206667 21.206667V362.666667a21.333333 21.333333 0 0 1-42.666667 0V200.833333L164.42 889.753333A21.266667 21.266667 0 0 1 149.333333 896z"
              fill="#5C5C66"
              class="icon-fill"
              p-id="1445"
            ></path>
          </svg>
          <svg
            t="1741314616196"
            class="ic-arrow"
            :style="getArrowStyle(slotInfo.highlightRect)"
            viewBox="0 0 1536 1024"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            p-id="6877"
            width="200"
            height="200"
          >
            <path
              d="M269.824 1024H0l122.481778-133.461333V56.888889a56.888889 56.888889 0 0 1 56.888889-56.888889H1479.111111a56.888889 56.888889 0 0 1 56.888889 56.888889v910.222222a56.888889 56.888889 0 0 1-56.888889 56.888889z"
              class="svg-fill"
              p-id="6878"
            ></path>
          </svg>
        </div>
      </template>
    </MaskWithHighlight>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { useTag } from '@/utils/tagging'
import useEditorCtx from '@/components/editor/EditorContextProvider.vue'
import MaskWithHighlight from '@/components/common/MaskWithHighlight.vue'
import type { HighlightRect } from '@/components/common/MaskWithHighlight.vue'
import type { Step } from '@/apis/guidance'

const editorCtx = useEditorCtx
const filter = editorCtx.filter
const props = defineProps<{
  step: Step
}>()

const emit = defineEmits<{
  stepCompleted: []
}>()

onMounted(async () => {
  await loadSnapshot(props.step.snapshot.startSnapshot)
  if (props.step.isApiControl) {
    filter.setFilter('apiReference', true, props.step.apis)
  }
  if (props.step.isAssetControl) {
    filter.setFilter('asset', true, props.step.assets)
  }
  if (props.step.isSpriteControl) {
    filter.setFilter('sprite', true, props.step.sprites)
  }
  if (props.step.isSoundControl) {
    filter.setFilter('sound', true, props.step.sounds)
  }
  if (props.step.isCostumeControl) {
    filter.setFilter('costume', true, props.step.costumes)
  }
  if (props.step.isAnimationControl) {
    filter.setFilter('animation', true, props.step.animations)
  }
  if (props.step.isWidgetControl) {
    filter.setFilter('widget', true, props.step.widgets)
  }
  if (props.step.isBackdropControl) {
    filter.setFilter('backdrop', true, props.step.backdrops)
  }
  currentGuidePositions = null
  setupTargetElementListener()
})

onBeforeUnmount(() => {
  filter.reset()
})

async function loadSnapshot(snapshotStr: string): Promise<void> {
  if (!snapshotStr) return

  try {
    const project = editorCtx.project

    const { files } = JSON.parse(snapshotStr)

    await project.load(files)
  } catch (error) {
    console.error('Failed to load snapshot:', error)
  }
}

async function getSnapshot(): Promise<string> {
  const project = editorCtx.project
  const files = await project.getFiles()
  return JSON.stringify({ files })
}

function calculateGuidePositions(highlightRect: HighlightRect) {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  // 确定高亮区域所在象限
  const isLeft = highlightRect.left + highlightRect.width / 2 < windowWidth / 2
  const isTop = highlightRect.top + highlightRect.height / 2 < windowHeight / 2

  const arrowSize = { width: 200, height: 200 }
  const niuxiaoqiSize = { width: 300, height: 320 }
  const bubbleSize = { width: 300, height: 200 }

  let arrowPosition = { left: 0, top: 0 }
  let niuxiaoqiPosition = { left: 0, top: 0 }
  let bubblePosition = { left: 0, top: 0 }

  // 根据象限计算位置
  if (isLeft && isTop) {
    // 左上象限
    arrowPosition = {
      left: highlightRect.left + highlightRect.width,
      top: highlightRect.top + highlightRect.height
    }
    niuxiaoqiPosition = {
      left: arrowPosition.left + arrowSize.width,
      top: arrowPosition.top + arrowSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left + niuxiaoqiSize.width,
      top: niuxiaoqiPosition.top - bubbleSize.height
    }
  } else if (!isLeft && isTop) {
    // 右上象限
    arrowPosition = {
      left: highlightRect.left - arrowSize.width,
      top: highlightRect.top + highlightRect.height
    }
    niuxiaoqiPosition = {
      left: arrowPosition.left - niuxiaoqiSize.width,
      top: arrowPosition.top + arrowSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left - bubbleSize.width,
      top: niuxiaoqiPosition.top - bubbleSize.height
    }
  } else if (isLeft && !isTop) {
    // 左下象限
    arrowPosition = {
      left: highlightRect.left + highlightRect.width,
      top: highlightRect.top - arrowSize.height
    }
    niuxiaoqiPosition = {
      left: arrowPosition.left + arrowSize.width,
      top: arrowPosition.top - niuxiaoqiSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left + niuxiaoqiSize.width,
      top: niuxiaoqiPosition.top + niuxiaoqiSize.height
    }
  } else {
    // 右下象限
    arrowPosition = {
      left: highlightRect.left - arrowSize.width,
      top: highlightRect.top - arrowSize.height
    }
    niuxiaoqiPosition = {
      left: arrowPosition.left - niuxiaoqiSize.width,
      top: arrowPosition.top - niuxiaoqiSize.height
    }
    bubblePosition = {
      left: niuxiaoqiPosition.left - bubbleSize.width,
      top: niuxiaoqiPosition.top + niuxiaoqiSize.height
    }
  }

  return {
    arrowStyle: {
      position: 'absolute',
      left: `${arrowPosition.left}px`,
      top: `${arrowPosition.top}px`,
      width: `${arrowSize.width}px`,
      height: `${arrowSize.height}px`
    },
    niuxiaoqiStyle: {
      position: 'absolute',
      left: `${niuxiaoqiPosition.left}px`,
      top: `${niuxiaoqiPosition.top}px`,
      width: `${niuxiaoqiSize.width}px`,
      height: `${niuxiaoqiSize.height}px`
    },
    bubbleStyle: {
      position: 'absolute',
      left: `${bubblePosition.left}px`,
      top: `${bubblePosition.top}px`,
      width: `${bubbleSize.width}px`,
      height: `${bubbleSize.height}px`
    }
  }
}

let currentGuidePositions: { arrowStyle: any; niuxiaoqiStyle: any; bubbleStyle: any } | null = null

function getArrowStyle(highlightRect: HighlightRect) {
  if (!currentGuidePositions) {
    currentGuidePositions = calculateGuidePositions(highlightRect)
  }
  return currentGuidePositions.arrowStyle
}

function getNiuxiaoqiStyle(highlightRect: HighlightRect) {
  if (!currentGuidePositions) {
    currentGuidePositions = calculateGuidePositions(highlightRect)
  }
  return currentGuidePositions.niuxiaoqiStyle
}

function getBubbleStyle(highlightRect: HighlightRect) {
  if (!currentGuidePositions) {
    currentGuidePositions = calculateGuidePositions(highlightRect)
  }
  return currentGuidePositions.bubbleStyle
}

function setupTargetElementListener() {
  if (props.step.type !== 'following' || !props.step.target) return
  const { getElement } = useTag()

  const targetElement = computed(() => {
    return getElement(props.step.target)
  })

  if (targetElement.value) {
    targetElement.value.addEventListener('click', handleTargetElementClick)
  }
}

async function handleTargetElementClick() {
  if (props.step.type !== 'following') return

  if (props.step.snapshot?.endSnapshot) {
    const result = await compareSnapshot(props.step.snapshot.endSnapshot)
    if (result.success) {
      emit('stepCompleted')
    } else {
      console.warn('Snapshot comparison failed:', result.reason)
    }
  }
}

function handleCheckButtonClick() {
  emit('stepCompleted')
}

function compareSnapshot(snapshotStr: string): Promise<{ success: boolean; reason?: string }> {
  if (!snapshotStr) return Promise.resolve({ success: false, reason: 'No end snapshot' })
  return Promise.resolve({ success: true })
}
</script>
