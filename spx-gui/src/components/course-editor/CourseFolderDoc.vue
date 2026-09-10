<script setup lang="ts">
import { computed } from 'vue'
import { filename } from '@/utils/path'
import type { TutorialProject } from '@/models/tutorial/project'
import { getResourceKindDir, videosKind } from '@/models/tutorial/resource'
import { UIButton, UIEmpty } from '@/components/ui'
import type { CourseNode, FolderNode } from './course-tree'
import { getUploadResourceKind, validateUploadDir } from './upload'

const props = defineProps<{
  project: TutorialProject
  node: FolderNode
}>()

const emit = defineEmits<{
  open: [path: string]
  /** Upload files into this folder. */
  upload: [dir: string]
}>()

const isVideosFolder = computed(() => props.node.path === getResourceKindDir(videosKind))
const resourceKind = computed(() => getUploadResourceKind(props.node.path))
const canUpload = computed(() => validateUploadDir(props.project, props.node.path) == null)

function childLabel(child: CourseNode) {
  return child.type === 'project' ? filename(child.path) : child.name
}
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-y-auto p-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="m-0 truncate text-base font-semibold" :title="node.path">
        {{ isVideosFolder ? $t({ en: 'Videos', zh: '视频' }) : node.path }}
      </h2>
      <UIButton
        v-if="canUpload"
        v-radar="{ name: 'Upload into folder button', desc: 'Click to upload files into this folder' }"
        type="secondary"
        size="small"
        @click="emit('upload', node.path)"
      >
        {{ isVideosFolder ? $t({ en: 'Add video...', zh: '添加视频...' }) : $t({ en: 'Upload...', zh: '上传...' }) }}
      </UIButton>
    </div>
    <p v-if="isVideosFolder" class="m-0 text-sm text-grey-700">
      {{
        $t({
          en: 'Every file added here becomes a video the course program refers to by name, e.g.',
          zh: '放到这里的每个文件都成为一个视频，课程程序按名字引用它，例如'
        })
      }}
      <code>showVideo "step-to"</code>
    </p>
    <p v-else-if="resourceKind != null" class="m-0 text-sm text-grey-700">
      {{
        $t({
          en: `Every file added here becomes a ${resourceKind} resource package. The course program cannot address this kind yet.`,
          zh: `放到这里的每个文件都成为一个 ${resourceKind} 资源包。课程程序目前还不能引用这种资源。`
        })
      }}
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
