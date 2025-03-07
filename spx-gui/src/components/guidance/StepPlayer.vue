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
        <div class="guide-ui-container" :style="getGuideContainerStyle(slotInfo.highlightRect)">
          <img
            class="niuxiaoqi"
            :style="getMascotStyle(slotInfo.highlightRect)"
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
import { onMounted, onBeforeUnmount } from 'vue'
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
})

onBeforeUnmount(() => {
  filter.reset()
})

async function loadSnapshot(snapshotStr: string) {
  if (!snapshotStr) return

  try {
    const project = editorCtx.project

    const { metadata, files } = JSON.parse(snapshotStr)

    await project.load(metadata, files)
  } catch (error) {
    console.error('Failed to load snapshot:', error)
  }
}

function getGuideContainerStyle(highlightRect: HighlightRect) {
  return {
    left: highlightRect.left + 'px',
    top: highlightRect.top + 'px',
    width: highlightRect.width + 'px',
    height: highlightRect.height + 'px'
  }
}

function getMascotStyle(highlightRect: HighlightRect) {
  return {
    left: highlightRect.left + 'px',
    top: highlightRect.top + 'px'
  }
}

function getBubbleStyle(highlightRect: HighlightRect) {
  return {
    left: highlightRect.left + 'px',
    top: highlightRect.top + 'px'
  }
}

function getArrowStyle(highlightRect: HighlightRect) {
  return {
    left: highlightRect.left + 'px',
    top: highlightRect.top + 'px'
  }
}
function handleCheckButtonClick() {
  emit('stepCompleted')
}
</script>
