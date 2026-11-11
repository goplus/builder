<template>
  <EditorItemDetail :name="costume.name" @rename="emit('rename')">
    <template v-if="$slots.leading != null" #leading>
      <slot name="leading"></slot>
    </template>
    <template v-if="$slots.ops != null" #ops>
      <slot name="ops"></slot>
    </template>
    <ResourceCanvas :resource-key="costume.id" :image="costume.img">
      <UIImg class="h-full w-full" :src="imgSrc" :loading="imgLoading" />
      <template #overlay="{ area }">
        <slot v-if="!imgLoading" name="overlay" :area="area"></slot>
      </template>
    </ResourceCanvas>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { UIImg } from '@/components/ui'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import type { Costume } from '@/models/spx/costume'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import ResourceCanvas from './ResourceCanvas.vue'

const props = defineProps<{
  costume: Costume
}>()

const emit = defineEmits<{
  rename: []
}>()

const [imgSrc, imgLoading] = useRenderableImageUrl(() => props.costume.img)
</script>
