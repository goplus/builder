<template>
  <div class="step-player">
    <MaskWithHighlight :visible="true" :highlight-element-path="props.step.target">
      <template v-if="props.step.type === 'coding'" #code-button>
        <div class="code-button-container">
          <button @click="handleCheckButtonClick">Check</button>
        </div>
      </template>
      <template v-if="props.step.type === 'following'" #guide-ui>
        <div class="guide-ui-container"></div>
      </template>
    </MaskWithHighlight>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import useEditorCtx from '@/components/editor/EditorContextProvider.vue'
import MaskWithHighlight from '@/components/common/MaskWithHighlight.vue'
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

function handleCheckButtonClick() {
  emit('stepCompleted')
}
</script>
