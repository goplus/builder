<template>
  <div class="step-player">
    <MaskWithHighlight :visible="true" :highlight-element-path="props.step.target">
      <template v-if="props.step.type === 'coding'">
        <CodingStep :step="props.step" @coding-step-completed="handleStepCompleted" />
      </template>
      <template v-if="props.step.type === 'following'" #default="{ slotInfo }">
        <FollowingStep :step="props.step" :slot-info="slotInfo" @following-step-completed="handleStepCompleted" />
      </template>
    </MaskWithHighlight>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, nextTick } from 'vue'

import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import MaskWithHighlight from '@/components/common/MaskWithHighlight.vue'
import type { Step } from '@/apis/guidance'
import CodingStep from './CodingStep.vue'
import FollowingStep from './FollowingStep.vue'
import { getFiles } from '@/models/common/cloud'
import { useCodeEditorCtx } from '@/components/editor/code-editor/context'

const editorCtx = useEditorCtx()
const codeEditorCtx = useCodeEditorCtx()

const props = defineProps<{
  step: Step
}>()

const emit = defineEmits<{
  stepCompleted: []
}>()

onMounted(async () => {
  try {
    if (props.step.snapshot?.startSnapshot) {
      await loadSnapshot(props.step.snapshot.startSnapshot)
    }
  } catch (error) {
    console.error('Failed to load snapshot:', error)
  }

  setFilterControls()
  await nextTick()
})

watch(
  () => props.step,
  async (newStep) => {
    await initializeStep(newStep)
  },
  { deep: true }
)

async function initializeStep(step: Step) {
  try {
    if (step.snapshot?.startSnapshot) {
      await loadSnapshot(step.snapshot.startSnapshot)
    }

    setFilterControls()

    await nextTick()
  } catch (error) {
    console.error('Failed to initialize step:', error)
  }
}

async function loadSnapshot(snapshotStr: string): Promise<void> {
  if (!snapshotStr) return

  try {
    const project = editorCtx.project
    const fileCollection = JSON.parse(snapshotStr)
    const files = getFiles(fileCollection)
    await project.loadGameFiles(files)
  } catch (error) {
    console.error('Failed to load snapshot:', error)
  }
}

function setFilterControls() {
  const codeFilter = codeEditorCtx.listFilter // 用于API引用筛选
  const editorFilter = editorCtx.listFilter // 用于其他素材筛选

  codeFilter.reset()
  editorFilter.reset()

  codeFilter.setFilter('apiReference', props.step.isApiControl, props.step.apis)
  editorFilter.setFilter('asset', props.step.isAssetControl, props.step.assets)
  editorFilter.setFilter('sprite', props.step.isSpriteControl, props.step.sprites)
  editorFilter.setFilter('sound', props.step.isSoundControl, props.step.sounds)
  editorFilter.setFilter('costume', props.step.isCostumeControl, props.step.costumes)
  editorFilter.setFilter('animation', props.step.isAnimationControl, props.step.animations)
  editorFilter.setFilter('widget', props.step.isWidgetControl, props.step.widgets)
  editorFilter.setFilter('backdrop', props.step.isBackdropControl, props.step.backdrops)
}
async function handleStepCompleted() {
  emit('stepCompleted')
}
</script>

<style scoped lang="scss">
.step-player {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1001;
}
</style>
