<script setup lang="ts">
import { computed } from 'vue'
import { useFileUrl } from '@/utils/file'
import type { File } from '@/models/common/file'
import { UIImg } from '@/components/ui'
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
  <div
    v-radar="{
      name: 'Sprite image item',
      desc: 'Click to select this image as the default costume for the sprite'
    }"
    class="flex items-center justify-center overflow-hidden border-2 border-transparent bg-grey-300 p-1 transition-[transform,border-radius] duration-200 ease-in-out"
    :class="[
      compact ? 'h-22 w-22 rounded-sm' : 'h-35 w-35 rounded-md',
      active ? 'border-turquoise-500 bg-turquoise-200 cursor-default' : '',
      disabled ? 'cursor-not-allowed opacity-50' : '',
      loading ? 'cursor-default pointer-events-none' : '',
      !active && !disabled && !loading ? 'cursor-pointer hover:bg-grey-400' : ''
    ]"
  >
    <GenLoading v-if="loading" animation-style="width: 60px; height: 60px;" />
    <UIImg v-else :class="compact ? 'h-15 w-15' : 'h-25 w-25'" :src="url" :alt="file?.name" />
  </div>
</template>
