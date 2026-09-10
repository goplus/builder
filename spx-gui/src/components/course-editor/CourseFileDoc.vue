<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useAsyncComputed } from '@/utils/utils'
import { extname } from '@/utils/path'
import { fromText, toText } from '@/models/common/file'
import type { TutorialProject } from '@/models/tutorial/project'
import { UIButton, UITag } from '@/components/ui'
import type { FileNode } from './course-tree'
import CourseTextDoc from './CourseTextDoc.vue'

/**
 * A record the course format gives no role to. It is shown by its kind (text, image, other) and kept as it is when
 * the course is saved; the author can edit text and delete any of them.
 */
const props = defineProps<{
  project: TutorialProject
  node: FileNode
}>()

const emit = defineEmits<{
  deleted: []
}>()

// Text is loaded once per path. Edits produce new `File` records, which must not reload the editor.
const text = ref<string | null>(null)
watch(
  () => props.node.path,
  async (path) => {
    text.value = null
    const { kind, file } = props.node
    if (kind !== 'text') return
    const loaded = await toText(file)
    if (props.node.path === path) text.value = loaded
  },
  { immediate: true }
)

function languageOf(path: string) {
  switch (extname(path).slice(1).toLowerCase()) {
    case 'gox':
    case 'spx':
      return 'xgo'
    case 'json':
      return 'json'
    default:
      return 'plaintext'
  }
}

function handleTextChange(next: string) {
  text.value = next
  props.project.setExtraFile(props.node.path, fromText(props.node.name, next))
}

const imageUrl = useAsyncComputed(async (onCleanup) => {
  if (props.node.kind !== 'image') return null
  return props.node.file.url(onCleanup)
})

const handleDelete = useMessageHandle(
  () => {
    props.project.removeExtraFile(props.node.path)
    emit('deleted')
  },
  { en: 'Failed to delete file', zh: '删除文件失败' }
)
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-hidden p-4">
    <div class="flex flex-none items-center gap-2">
      <h2 class="m-0 min-w-0 flex-1 truncate text-base font-semibold" :title="node.path">{{ node.path }}</h2>
      <UITag color="warning">{{ $t({ en: 'The course does not use this file', zh: '课程不会使用此文件' }) }}</UITag>
      <UIButton
        v-radar="{ name: 'Delete file button', desc: 'Click to remove this file from the course' }"
        type="neutral"
        size="small"
        @click="handleDelete.fn"
      >
        {{ $t({ en: 'Delete', zh: '删除' }) }}
      </UIButton>
    </div>
    <div class="min-h-0 flex-1">
      <CourseTextDoc
        v-if="node.kind === 'text' && text != null"
        :text="text"
        :language="languageOf(node.path)"
        @update:text="handleTextChange"
      />
      <img
        v-else-if="node.kind === 'image' && imageUrl != null"
        class="max-h-full max-w-full rounded border border-line"
        :src="imageUrl"
        :alt="node.name"
      />
      <p v-else-if="node.kind === 'other'" class="m-0 text-sm text-grey-700">
        {{ $t({ en: 'No preview for this file type', zh: '此类型文件暂无预览' }) }}
        <code v-if="node.file.type !== ''">{{ node.file.type }}</code>
      </p>
    </div>
  </div>
</template>
