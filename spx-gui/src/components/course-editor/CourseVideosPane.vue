<script setup lang="ts">
import { useMessageHandle } from '@/utils/exception'
import { stripExt } from '@/utils/path'
import { selectFileWithUploadLimit } from '@/models/common/cloud'
import { fromNativeFile } from '@/models/common/file'
import type { TutorialProject } from '@/models/tutorial/project'
import { getVideoName, validateVideoName, Video } from '@/models/tutorial/video'
import { UIButton, UIEmpty } from '@/components/ui'
import CourseVideoItem from './CourseVideoItem.vue'

const props = defineProps<{
  project: TutorialProject
}>()

const handleAddVideo = useMessageHandle(
  async () => {
    const nativeFile = await selectFileWithUploadLimit({ accept: ['mp4', 'webm'] })
    const base = stripExt(nativeFile.name)
    // Derive the video name from the file name when it is usable, otherwise start from a generic name.
    const name = getVideoName(props.project, validateVideoName(base, null) == null ? base : 'video')
    props.project.addVideo(new Video(name, fromNativeFile(nativeFile)))
  },
  { en: 'Failed to add video', zh: '添加视频失败' }
)

function handleRemoveVideo(id: string) {
  props.project.removeVideo(id)
}
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-y-auto p-3">
    <UIButton
      v-radar="{ name: 'Add video button', desc: 'Click to add a video file to the course' }"
      type="secondary"
      size="small"
      :loading="handleAddVideo.isLoading.value"
      @click="handleAddVideo.fn"
    >
      {{ $t({ en: 'Add video...', zh: '添加视频...' }) }}
    </UIButton>
    <UIEmpty v-if="project.videos.length === 0" size="small">
      {{ $t({ en: 'No videos yet', zh: '还没有视频' }) }}
    </UIEmpty>
    <ul v-else class="flex flex-col gap-2">
      <CourseVideoItem
        v-for="video in project.videos"
        :key="video.id"
        :video="video"
        @remove="handleRemoveVideo(video.id)"
      />
    </ul>
  </div>
</template>
