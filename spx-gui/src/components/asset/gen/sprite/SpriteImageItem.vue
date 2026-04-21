<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import type { File } from '@/models/common/file'
import { UIBlockItem, UIImg } from '@/components/ui'
import { useImageSelectorCompact, useImageSelectorDisabled } from '../common/ImageSelector.vue'
import GenLoading from '../common/GenLoading.vue'

const props = withDefaults(
  defineProps<{
    file?: File | null
    active?: boolean
    loading?: boolean
  }>(),
  {
    file: null,
    active: false,
    loading: false
  }
)

const disabled = useImageSelectorDisabled()
const compact = useImageSelectorCompact()
const [url, fileLoading] = useFileUrl(() => props.file)
const loading = computed(() => props.loading || fileLoading.value)
</script>

<template>
  <UIBlockItem
    v-radar="{
      name: 'Sprite image item',
      desc: 'Click to select this image as the default costume for the sprite'
    }"
    class="justify-center"
    :size="compact ? 'medium' : 'large'"
    :interactive="!disabled && !loading"
    :active="active"
  >
    <GenLoading v-if="loading" animation-style="width: 60px; height: 60px;" cover />
    <UIImg v-else :class="compact ? 'h-15 w-15' : 'h-25 w-25'" :src="url" :alt="file?.name" />
  </UIBlockItem>
</template>
