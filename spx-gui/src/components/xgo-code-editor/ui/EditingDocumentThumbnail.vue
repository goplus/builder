<!-- The thumbnail of whatever the editor is currently editing (a sprite's default costume, the
     stage's backdrop), shown in the corner of the code area. The document tabs carry the same
     image, but they are hidden in the simplified layout — where knowing whose code this is matters
     most, because nothing else on screen says so. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import { UIImg, UITooltip } from '@/components/ui'
import { useCodeEditorUICtx } from './CodeEditorUI.vue'

const codeEditorUICtx = useCodeEditorUICtx()
const activeTextDocument = computed(() => codeEditorUICtx.ui.activeTextDocument)
const [thumbnailUrl] = useRenderableImageUrl(() => activeTextDocument.value?.thumbnailFile ?? null)
</script>

<template>
  <UITooltip v-if="thumbnailUrl != null" placement="left">
    {{ activeTextDocument != null ? $t(activeTextDocument.displayName) : '' }}
    <template #trigger>
      <div
        v-radar="{ name: 'Editing document thumbnail', desc: 'Thumbnail of what the code being edited belongs to' }"
        class="h-10 w-10 flex items-center rounded-md bg-grey-300 p-0.5"
      >
        <UIImg class="h-full w-full rounded-[6px]" :src="thumbnailUrl" />
      </div>
    </template>
  </UITooltip>
</template>
