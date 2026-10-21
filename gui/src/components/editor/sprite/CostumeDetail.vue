<template>
  <EditorItemDetail :name="costume.name" @rename="emit('rename')">
    <template v-if="$slots.leading != null" #leading>
      <slot name="leading"></slot>
    </template>
    <template v-if="$slots.ops != null" #ops>
      <slot name="ops"></slot>
    </template>
    <div class="relative flex-1 overflow-hidden rounded-sm w-full">
      <CheckerboardBackground class="absolute inset-0" />
      <UIImg class="h-full w-full" :src="imgSrc" :loading="imgLoading" />
    </div>
  </EditorItemDetail>
</template>

<script setup lang="ts">
import { UIImg } from '@/components/ui'
import { useRenderableImageUrl } from '@/utils/img-rendering'
import type { Costume } from '@/models/spx/costume'
import EditorItemDetail from '../common/EditorItemDetail.vue'
import CheckerboardBackground from './CheckerboardBackground.vue'

const props = defineProps<{
  costume: Costume
}>()

const emit = defineEmits<{
  rename: []
}>()

const [imgSrc, imgLoading] = useRenderableImageUrl(() => props.costume.img)
</script>
