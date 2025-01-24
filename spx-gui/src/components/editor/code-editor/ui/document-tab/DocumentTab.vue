<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import { Sprite } from '@/models/sprite'
import { Stage } from '@/models/stage'
import { UIImg, UITooltip } from '@/components/ui'
import { textDocumentId2CodeFileName, textDocumentId2ResourceModelId } from '../../common'
import type { TextDocument } from '../../text-document'
import { useCodeEditorUICtx } from '../CodeEditorUI.vue'

const props = defineProps<{
  textDocument: TextDocument
  isActive: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const codeEditorUICtx = useCodeEditorUICtx()

const resourceModel = computed(() => {
  const project = codeEditorUICtx.ui.project
  const resourceModelId = textDocumentId2ResourceModelId(props.textDocument.id, project)
  if (resourceModelId == null) return null
  return project.getResourceModel(resourceModelId)
})

const name = computed(() => textDocumentId2CodeFileName(props.textDocument.id))

const [spriteImgUrl] = useFileUrl(() => {
  if (resourceModel.value instanceof Sprite) return resourceModel.value.defaultCostume?.img
  return null
})

const [stageImgUrl] = useFileUrl(() => {
  if (resourceModel.value instanceof Stage) return resourceModel.value.defaultBackdrop?.img
  return null
})
</script>

<template>
  <UITooltip placement="right">
    {{ $t(name) }}
    <template #trigger>
      <div class="document-tab" :class="{ active: isActive }" @click="emit('click')">
        <UIImg v-if="spriteImgUrl != null" class="sprite-img" :src="spriteImgUrl" />
        <UIImg v-else-if="stageImgUrl != null" class="stage-img" :src="stageImgUrl" />
      </div>
    </template>
  </UITooltip>
</template>

<style lang="scss" scoped>
.document-tab {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  border-radius: var(--ui-border-radius-1);
  border: 2px solid transparent;
  transition: 0.2s;
  background-color: var(--ui-color-grey-300);

  &.active {
    border: 2px solid var(--ui-color-yellow-500);
    background-color: var(--ui-color-yellow-200);
  }

  &:not(.active) {
    cursor: pointer;
    &:hover {
      background-color: var(--ui-color-grey-300);
    }
  }
}

.sprite-img,
.stage-img {
  border-radius: 4px;
}

.sprite-img {
  width: 100%;
  height: 100%;
}

.stage-img {
  width: 100%;
  aspect-ratio: 4 / 3;
}
</style>
