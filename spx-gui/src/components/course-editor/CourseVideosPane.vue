<script setup lang="ts">
import { useMessageHandle } from '@/utils/exception'
import { stripExt } from '@/utils/path'
import { selectFileWithUploadLimit } from '@/models/common/cloud'
import { fromNativeFile } from '@/models/common/file'
import type { TutorialProject } from '@/models/tutorial/project'
import { getVideoName, validateVideoName, Video } from '@/models/tutorial/video'
import { UIButton, UIEmpty } from '@/components/ui'

const props = defineProps<{
  project: TutorialProject
}>()

const emit = defineEmits<{
  open: [name: string]
}>()

const handleAddVideo = useMessageHandle(
  async () => {
    const nativeFile = await selectFileWithUploadLimit({ accept: ['mp4', 'webm'] })
    const base = stripExt(nativeFile.name)
    // Derive the video name from the file name when it is usable, otherwise start from a generic name.
    const name = getVideoName(props.project, validateVideoName(base, null) == null ? base : 'video')
    props.project.addVideo(new Video(name, fromNativeFile(nativeFile)))
    emit('open', name)
  },
  { en: 'Failed to add video', zh: '添加视频失败' }
)
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-y-auto p-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="m-0 text-base font-semibold">{{ $t({ en: 'Videos', zh: '视频' }) }}</h2>
      <UIButton
        v-radar="{ name: 'Add video button', desc: 'Click to add a video file to the course' }"
        type="secondary"
        size="small"
        :loading="handleAddVideo.isLoading.value"
        @click="handleAddVideo.fn"
      >
        {{ $t({ en: 'Add video...', zh: '添加视频...' }) }}
      </UIButton>
    </div>
    <p class="m-0 text-sm text-grey-700">
      {{ $t({ en: 'The course program refers to a video by its name, e.g.', zh: '课程程序按名字引用视频，例如' }) }}
      <code>showVideo "step-to"</code>
    </p>
    <UIEmpty v-if="project.videos.length === 0" size="small">
      {{ $t({ en: 'No videos yet', zh: '还没有视频' }) }}
    </UIEmpty>
    <ul v-else class="m-0 flex list-none flex-col gap-1 p-0">
      <li v-for="video in project.videos" :key="video.id">
        <button
          v-radar="{ name: `Open video ${video.name}`, desc: 'Click to open this video' }"
          class="w-full cursor-pointer rounded border border-line bg-transparent px-3 py-2 text-left text-sm hover:bg-grey-400"
          @click="emit('open', video.name)"
        >
          {{ video.name }}
        </button>
      </li>
    </ul>
  </div>
</template>
