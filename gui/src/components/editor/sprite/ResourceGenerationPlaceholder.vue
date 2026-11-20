<script setup lang="ts">
import { UIEmpty } from '@/components/ui'
import ResourceCanvas from './ResourceCanvas.vue'
import { useResourceCanvas } from './resource-canvas'

const canvas = useResourceCanvas()

defineProps<{
  resourceKey: string
  mediaType: 'image' | 'video'
}>()
</script>

<template>
  <ResourceCanvas :resource-key="resourceKey">
    <div
      class="h-full w-full"
      :style="mediaType === 'video' && canvas != null ? { height: 'calc(100% + 58px)' } : null"
      role="img"
      :aria-label="
        $t(
          mediaType === 'image'
            ? { en: 'Image placeholder', zh: '图片占位' }
            : { en: 'Video placeholder', zh: '视频占位' }
        )
      "
    >
      <UIEmpty size="large" img="box">
        <template #default />
      </UIEmpty>
    </div>
  </ResourceCanvas>
</template>
