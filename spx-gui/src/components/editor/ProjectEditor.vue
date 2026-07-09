<template>
  <template v-if="isTutorialCourse">
    <section
      v-radar="{ name: `Editor for ${selected.type}`, desc: `Main editor panel for editing ${selected.type}` }"
      class="tutorial-editor-pane"
    >
      <SpriteEditor
        v-if="selected.type === 'sprite' && selected.sprite != null"
        :sprite="selected.sprite"
        :state="editorCtx.state.spriteState!"
      />
      <StageEditor v-else-if="selected.type === 'stage'" :stage="project.stage" :state="editorCtx.state.stageState" />
      <EditorPlaceholder v-else />
    </section>
    <section class="tutorial-preview-pane">
      <EditorPreview tutorial-mode />
    </section>
  </template>
  <template v-else>
    <!-- Using v-show preserves some page states, e.g. code editor scroll pos -->
    <!-- Using overflow-visible class to avoid cutting dropdown menu of CodeTextEditor (monaco) -->
    <UICard
      v-show="isPreviewMode"
      v-radar="{ name: `Editor for ${selected.type}`, desc: `Main editor panel for editing ${selected.type}` }"
      class="relative flex-[1_1_0] min-w-0 flex flex-col overflow-visible!"
    >
      <!--
        TODO: optimize performance for switching between editors, which corresponds to selection change.
        There's known issue with Vue `KeepAlive`:
        * It increases difficulty of implementing the inner components.
          For example: we need to listen to extra events (activated/deactivated) to do initialization and cleanup.
        * We use custom directive to capture UI information, which does not work well with KeepAlive.
          For details, see: https://github.com/vuejs/core/issues/2349
      -->
      <SpriteEditor
        v-if="selected.type === 'sprite' && selected.sprite != null"
        :sprite="selected.sprite"
        :state="editorCtx.state.spriteState!"
      />
      <StageEditor v-else-if="selected.type === 'stage'" :stage="project.stage" :state="editorCtx.state.stageState" />
      <EditorPlaceholder v-else />
    </UICard>
    <div v-show="isPreviewMode" class="min-w-0 flex-[0_0_496px] flex flex-col gap-xl">
      <EditorPreview />
      <EditorPanels />
    </div>
  </template>
  <MapEditor
    v-if="!isPreviewMode && !isTutorialCourse"
    :project="editorCtx.project"
    :selected-sprite-id="editorCtx.state.selectedSprite?.id ?? null"
    @update:selected-sprite-id="handleSpriteSelect"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UICard } from '@/components/ui'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'
import EditorPreview from './preview/EditorPreview.vue'
import EditorPanels from './panels/EditorPanels.vue'
import EditorPlaceholder from './common/placeholder/EditorPlaceholder.vue'
import { useEditorCtx } from './EditorContextProvider.vue'
import { EditMode } from './editor-state'
import MapEditor from './map-editor/MapEditor.vue'
import { useSpxEditorCopilot } from './copilot'
import { useMaybeTutorial } from '@/components/tutorials/tutorial'

const editorCtx = useEditorCtx()
const tutorial = useMaybeTutorial()
const project = computed(() => editorCtx.project)
const selected = computed(() => editorCtx.state.selected)
const isPreviewMode = computed(() => editorCtx.state.selectedEditMode === EditMode.Default)
const isTutorialCourse = computed(() => tutorial?.currentCourse != null)

useSpxEditorCopilot()

function handleSpriteSelect(spriteId: string | null) {
  if (spriteId == null) return
  editorCtx.state.selectSprite(spriteId)
}
</script>

<style scoped>
.tutorial-editor-pane,
.tutorial-preview-pane {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--ui-color-grey-100);
}

.tutorial-editor-pane {
  flex: 1 1 calc(998 / 1920 * 100%);
  border-right: 1px solid var(--ui-color-grey-400);
}

.tutorial-preview-pane {
  position: relative;
  flex: 1 1 calc(922 / 1920 * 100%);
  min-width: 660px;
  background:
    radial-gradient(circle at 18% 22%, rgba(93, 167, 74, 0.22) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 38%, rgba(69, 142, 62, 0.2) 0 1px, transparent 2px),
    radial-gradient(circle at 44% 78%, rgba(108, 185, 80, 0.18) 0 1px, transparent 2px),
    #78c966;
  background-size:
    120px 96px,
    150px 118px,
    180px 140px,
    auto;
}
</style>
