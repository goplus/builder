<template>
  <TagNode name="project-editor">
    <UICard class="main">
      <KeepAlive>
        <SoundEditor v-if="editorCtx.project.selectedSound != null" :sound="editorCtx.project.selectedSound" />
        <SpriteEditor v-else-if="editorCtx.project.selectedSprite != null" :sprite="editorCtx.project.selectedSprite" />
        <StageEditor v-else-if="editorCtx.project.selected?.type === 'stage'" :stage="editorCtx.project.stage" />
        <EditorPlaceholder v-else />
      </KeepAlive>
    </UICard>
  </TagNode>
  <div class="sider">
    <TagNode name="editor-preview">
      <EditorPreview />
    </TagNode>
    <EditorPanels />
  </div>
  <button style="position: fixed; bottom: 0; left: 0; width: 200px; height: 50px; background-color: #000; color: #fff;z-index: 100000;" @click="handleNewWholeStoryLineProject">测试按钮</button>
</template>

<script setup lang="ts">
import { UICard } from '@/components/ui'
import SoundEditor from './sound/SoundEditor.vue'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'
import EditorPreview from './preview/EditorPreview.vue'
import EditorPanels from './panels/EditorPanels.vue'
import EditorPlaceholder from './common/placeholder/EditorPlaceholder.vue'
import { useEditorCtx } from './EditorContextProvider.vue'
import TagNode from '@/utils/tagging/TagNode.vue'

import { useMessageHandle } from '@/utils/exception'
import { useCreateWholeStoryLineProject } from '@/components/guidance'
const createWholeStoryLineProject = useCreateWholeStoryLineProject()

const handleNewWholeStoryLineProject = useMessageHandle(
  async () => {
    const name = await createWholeStoryLineProject(
      { en: 'Cross the road', zh: '过马路' }, 
      editorCtx.project
    )
    // router.push(getProjectEditorRoute(name))
  },
  { en: 'Failed to create new project', zh: '新建项目失败' }
).fn

const editorCtx = useEditorCtx()
</script>

<style scoped lang="scss">
.main {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: visible; // avoid cutting dropdown menu of CodeTextEditor (monaco)
}
.sider {
  flex: 0 0 492px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}
</style>
