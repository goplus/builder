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
      name: 'Backdrop image item',
      desc: 'Click to select this image as the backdrop'
    }"
    class="justify-center"
    :class="compact ? 'h-16.5' : 'h-27'"
    :size="compact ? 'medium' : 'large'"
    :interactive="!disabled && !loading"
    :active="active"
  >
    <GenLoading v-if="loading" animation-style="width: 60px; height: 60px;" cover />
    <UIImg v-else :class="compact ? 'h-14.5 w-20 rounded-[4px]' : 'h-25 w-33 rounded-sm'" :src="url" size="cover" />
  </UIBlockItem>
</template>
