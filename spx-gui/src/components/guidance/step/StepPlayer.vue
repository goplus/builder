<template>
  <div class="step-player">
    <MaskWithHighlight :visible="true" :highlight-element-path="props.step.target">
      <template v-if="stepType === 'coding'">
        <CodingStep :step="props.step" @coding-step-completed="handleStepCompleted" />
      </template>
      <template v-if="stepType === 'following'" #default="{ slotInfo }">
        <FollowingStep :step="props.step" :slot-info="slotInfo" @following-step-completed="handleStepCompleted" />
      </template>
    </MaskWithHighlight>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, onUpdated } from 'vue'
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import MaskWithHighlight from '@/components/common/MaskWithHighlight.vue'
import type { Step } from '@/apis/guidance'
import CodingStep from './CodingStep.vue'
import FollowingStep from './FollowingStep.vue'

const editorCtx = useEditorCtx()
const filter = editorCtx.listFilter

const props = defineProps<{
  step: Step
}>()

const emit = defineEmits<{
  stepCompleted: []
}>()

const stepType = ref<'coding' | 'following' | null>(props.step.type)

onMounted(async () => {
  try {
    if (props.step.snapshot?.startSnapshot) {
      await loadSnapshot(props.step.snapshot.startSnapshot)
    }
  } catch (error) {
    console.error('Failed to load snapshot:', error)
  }

  setFilterControls()
})

onUpdated(async () => {
  stepType.value = props.step.type
  try {
    if (props.step.snapshot?.startSnapshot) {
      await loadSnapshot(props.step.snapshot.startSnapshot)
    }
  } catch (error) {
    console.error('Failed to load snapshot:', error)
  }

  setFilterControls()
})

onBeforeUnmount(() => {
  filter.reset()
})

async function loadSnapshot(snapshotStr: string): Promise<void> {
  if (!snapshotStr) return

  try {
    const project = editorCtx.project
    const { files } = JSON.parse(snapshotStr)
    await project.loadGameFiles(files)
  } catch (error) {
    console.error('Failed to load snapshot:', error)
  }
}

function setFilterControls() {
  filter.setFilter('apiReference', props.step.isApiControl, props.step.apis)
  filter.setFilter('asset', props.step.isAssetControl, props.step.assets)
  filter.setFilter('sprite', props.step.isSpriteControl, props.step.sprites)
  filter.setFilter('sound', props.step.isSoundControl, props.step.sounds)
  filter.setFilter('costume', props.step.isCostumeControl, props.step.costumes)
  filter.setFilter('animation', props.step.isAnimationControl, props.step.animations)
  filter.setFilter('widget', props.step.isWidgetControl, props.step.widgets)
  filter.setFilter('backdrop', props.step.isBackdropControl, props.step.backdrops)
}

function handleStepCompleted() {
  stepType.value = null
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
