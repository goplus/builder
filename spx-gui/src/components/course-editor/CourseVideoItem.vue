<script setup lang="ts">
import { useAsyncComputed } from '@/utils/utils'
import type { Video } from '@/models/tutorial/video'
import { UIButton } from '@/components/ui'

const props = defineProps<{
  video: Video
}>()

const emit = defineEmits<{
  remove: []
}>()

const videoUrl = useAsyncComputed((onCleanup) => props.video.file.url(onCleanup))
</script>

<template>
  <li class="flex flex-col gap-2 rounded-md border border-line p-2">
    <div class="flex items-center justify-between gap-2">
      <!-- The course program refers to a video by this name, e.g. `showVideo "step-to"`. -->
      <span class="truncate text-sm font-medium" :title="video.name">{{ video.name }}</span>
      <UIButton
        v-radar="{ name: 'Remove video button', desc: 'Click to remove this video from the course' }"
        type="neutral"
        size="small"
        @click="emit('remove')"
      >
        {{ $t({ en: 'Remove', zh: '移除' }) }}
      </UIButton>
    </div>
    <video v-if="videoUrl != null" class="max-h-40 w-full rounded bg-black" :src="videoUrl" controls></video>
  </li>
</template>
