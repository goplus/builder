<script setup lang="ts">
import { computed } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { filename, stripExt } from '@/utils/path'
import { selectFileWithUploadLimit } from '@/models/common/cloud'
import { fromNativeFile } from '@/models/common/file'
import type { TutorialProject } from '@/models/tutorial/project'
import { getVideoAssetPath, getVideoName, validateVideoName, Video, videoAssetPath } from '@/models/tutorial/video'
import { UIButton, UIEmpty } from '@/components/ui'
import type { CourseNode, FolderNode } from './course-tree'

const props = defineProps<{
  project: TutorialProject
  node: FolderNode
}>()

const emit = defineEmits<{
  open: [path: string]
}>()

// Uploads are offered per resource kind; videos are the only kind so far, added in their folder.
const isVideosFolder = computed(() => props.node.path === videoAssetPath)

function childLabel(child: CourseNode) {
  return child.type === 'project' ? filename(child.path) : child.name
}

const handleAddVideo = useMessageHandle(
  async () => {
    const nativeFile = await selectFileWithUploadLimit({ accept: ['mp4', 'webm'] })
    const base = stripExt(nativeFile.name)
    // Derive the video name from the file name when it is usable, otherwise start from a generic name.
    const name = getVideoName(props.project, validateVideoName(base, null) == null ? base : 'video')
    props.project.addVideo(new Video(name, fromNativeFile(nativeFile)))
    emit('open', getVideoAssetPath(name))
  },
  { en: 'Failed to add video', zh: '添加视频失败' }
)
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-y-auto p-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="m-0 truncate text-base font-semibold" :title="node.path">
        {{ isVideosFolder ? $t({ en: 'Videos', zh: '视频' }) : node.path }}
      </h2>
      <UIButton
        v-if="isVideosFolder"
        v-radar="{ name: 'Add video button', desc: 'Click to add a video file to the course' }"
        type="secondary"
        size="small"
        :loading="handleAddVideo.isLoading.value"
        @click="handleAddVideo.fn"
      >
        {{ $t({ en: 'Add video...', zh: '添加视频...' }) }}
      </UIButton>
    </div>
    <p v-if="isVideosFolder" class="m-0 text-sm text-grey-700">
      {{ $t({ en: 'The course program refers to a video by its name, e.g.', zh: '课程程序按名字引用视频，例如' }) }}
      <code>showVideo "step-to"</code>
    </p>
    <UIEmpty v-if="node.children.length === 0" size="small">
      {{ $t({ en: 'Empty folder', zh: '空文件夹' }) }}
    </UIEmpty>
    <ul v-else class="m-0 flex list-none flex-col gap-1 p-0">
      <li v-for="child in node.children" :key="child.path">
        <button
          v-radar="{ name: `Open ${child.path}`, desc: 'Click to open this item' }"
          class="flex w-full cursor-pointer items-center gap-2 rounded border border-line bg-transparent px-3 py-2 text-left text-sm hover:bg-grey-400"
          @click="emit('open', child.path)"
        >
          <span class="truncate">{{ childLabel(child) }}</span>
          <span class="flex-none text-xs text-grey-700">{{ child.type }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
