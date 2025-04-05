<template>
  <div
    v-show="isShowIcon"
    ref="editorIconRef"
    class="guidance-editor-icon"
    :style="{ transform: `translate(${editorIconPos.x}px, ${editorIconPos.y}px)` }"
  >
    <img src="../icons/edit.svg" alt="guidance-editor" />
  </div>
  <div v-show="!isShowIcon" class="guidance-editor-container">
    <div class="guidance-editor-content">
      <StoryLineEditor
        v-show="editorStatus === editorStatusType.STORYLINE"
        v-model:story-line="storyLine"
        @level-change="handleLevelChange"
        @minimize="isShowIcon = true"
      />
      <LevelEditor
        v-show="editorStatus === editorStatusType.LEVELEDITOR"
        v-model:level="currentLevel"
        @back="editorStatus = editorStatusType.STORYLINE"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { type MaybeSavedStoryLine } from '@/apis/guidance'
import StoryLineEditor from './StoryLineEditor.vue'
import LevelEditor from './LevelEditor.vue'
import { useDrag } from '@/utils/dom'
import type { Pos } from '../LevelPlayer.vue'
const isShowIcon = ref<boolean>(true)
function setIsShowIcon(value: boolean) {
  isShowIcon.value = value
}

provide('isShowIcon', isShowIcon)
provide('setIsShowIcon', setIsShowIcon)

enum editorStatusType {
  STORYLINE,
  LEVELEDITOR
}
const props = defineProps<{
  storyLine: MaybeSavedStoryLine
}>()
const editorStatus = ref<editorStatusType>(editorStatusType.STORYLINE)
const levelIndex = ref<number>(0)
const editorIconPos = ref<Pos>({
  x: 0,
  y: 0
})

const editorIconRef = ref<HTMLElement | null>(null)
const storyLine = ref<MaybeSavedStoryLine>(props.storyLine)

function handleLevelChange(index: number) {
  levelIndex.value = index
  editorStatus.value = editorStatusType.LEVELEDITOR
}

const currentLevel = computed({
  get: () => storyLine.value.levels[levelIndex.value],
  set: (newValue) => {
    storyLine.value.levels[levelIndex.value] = newValue
  }
})

useDrag(
  editorIconRef,
  () => editorIconPos.value,
  (pos: Pos) => (editorIconPos.value = pos),
  {
    onClick: () => (isShowIcon.value = false)
  }
)
</script>

<style lang="scss" scoped>
.guidance-editor-container {
  z-index: 1000;
  position: absolute;
  top: 50px;
  left: 0;
  width: 100%;
  height: 100%;
}

.guidance-editor-icon {
  position: fixed;
  top: 50px;
  left: 50px;
  margin-left: 10px;
  margin-top: 10px;
  background-color: #fff;
  height: 40px;
  width: 40px;
  border-radius: 50%;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
  img {
    width: 40px;
    height: 40px;
    cursor: pointer;
  }
  &:hover {
    background-color: #d4f9ff;
    box-shadow: 0px 4px 10px 0px rgba(0, 0, 0, 0.5);
  }
}
.guidance-editor-content {
  background-color: #fff;
  width: 100%;
  height: 100%;
  padding: 10px;
}
</style>
