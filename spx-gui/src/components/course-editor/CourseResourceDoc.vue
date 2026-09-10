<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useAsyncComputed } from '@/utils/utils'
import { fromText, toText } from '@/models/common/file'
import type { TutorialProject } from '@/models/tutorial/project'
import { getResourceKindDir, validateResourceName, videosKind } from '@/models/tutorial/resource'
import { UIButton, UIEmpty, UITextInput } from '@/components/ui'
import { getFileKind } from './course-tree'
import CourseTextDoc from './CourseTextDoc.vue'

/** A resource package: shown by what its payload is (video, image, text, other), renamed and deleted here. */
const props = defineProps<{
  project: TutorialProject
  kind: string
  name: string
}>()

const emit = defineEmits<{
  /** The resource was renamed; carries its new path. */
  renamed: [path: string]
  /** The resource was removed; carries the path of its kind folder. */
  deleted: [path: string]
}>()

const resource = computed(() => props.project.getResource(props.kind, props.name))

const preview = computed(() => {
  const current = resource.value
  if (current == null) return 'none'
  if (props.kind === videosKind || current.file.type.startsWith('video/')) return 'video'
  return getFileKind(current.file, current.file.name)
})

const fileUrl = useAsyncComputed(async (onCleanup) => {
  const current = resource.value
  if (current == null || (preview.value !== 'video' && preview.value !== 'image')) return null
  return current.file.url(onCleanup)
})

// Text payloads are loaded once per resource; edits produce new records without reloading the editor.
const text = ref<string | null>(null)
watch(
  [() => props.kind, () => props.name],
  async () => {
    text.value = null
    const current = resource.value
    if (current == null || preview.value !== 'text') return
    const loaded = await toText(current.file)
    if (resource.value === current) text.value = loaded
  },
  { immediate: true }
)

function handleTextChange(next: string) {
  const current = resource.value
  if (current == null) return
  text.value = next
  current.setFile(fromText(current.file.name, next))
}

const nameInput = ref(props.name)
watch(
  () => props.name,
  (name) => {
    nameInput.value = name
  }
)

const handleRename = useMessageHandle(
  () => {
    const current = resource.value
    if (current == null) return
    const next = nameInput.value.trim()
    if (next === current.name) return
    const error = validateResourceName(props.kind, next, props.project)
    if (error != null) throw new DefaultException(error)
    current.setName(next)
    emit('renamed', current.assetPath)
  },
  { en: 'Failed to rename resource', zh: '重命名资源失败' }
)

function handleDelete() {
  const current = resource.value
  if (current == null) return
  props.project.removeResource(current.id)
  emit('deleted', getResourceKindDir(props.kind))
}
</script>

<template>
  <UIEmpty v-if="resource == null" class="m-auto" size="small">
    {{ $t({ en: `Resource "${kind}/${name}" does not exist`, zh: `资源“${kind}/${name}”不存在` }) }}
  </UIEmpty>
  <div v-else class="flex h-full flex-col gap-3 overflow-hidden p-4">
    <div class="flex flex-none items-center gap-2">
      <span class="flex-none text-sm text-grey-700">{{ kind }} /</span>
      <UITextInput
        v-radar="{ name: 'Resource name input', desc: 'Input for the resource name used by the course program' }"
        class="flex-1"
        :value="nameInput"
        @update:value="(v) => (nameInput = v)"
        @keydown.enter="handleRename.fn"
      />
      <UIButton
        v-radar="{ name: 'Rename resource button', desc: 'Click to apply the new resource name' }"
        type="secondary"
        size="small"
        :disabled="nameInput.trim() === resource.name"
        @click="handleRename.fn"
      >
        {{ $t({ en: 'Rename', zh: '重命名' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'Delete resource button', desc: 'Click to remove this resource from the course' }"
        type="neutral"
        size="small"
        @click="handleDelete"
      >
        {{ $t({ en: 'Delete', zh: '删除' }) }}
      </UIButton>
    </div>
    <p v-if="kind === videosKind" class="m-0 flex-none text-sm text-grey-700">
      {{ $t({ en: 'Referenced from the course program as', zh: '课程程序里这样引用它：' }) }}
      <code>showVideo "{{ resource.name }}"</code>
    </p>
    <p v-else class="m-0 flex-none text-sm text-grey-700">
      {{
        $t({
          en: `The course program cannot address ${kind} resources yet; the package is kept with the course.`,
          zh: `课程程序目前还不能引用 ${kind} 资源，这个包会随课程保存。`
        })
      }}
    </p>
    <div class="min-h-0 flex-1">
      <video
        v-if="preview === 'video' && fileUrl != null"
        class="max-h-full w-full rounded bg-black"
        :src="fileUrl"
        controls
      ></video>
      <img
        v-else-if="preview === 'image' && fileUrl != null"
        class="max-h-full max-w-full rounded border border-line"
        :src="fileUrl"
        :alt="resource.file.name"
      />
      <CourseTextDoc
        v-else-if="preview === 'text' && text != null"
        :text="text"
        language="plaintext"
        @update:text="handleTextChange"
      />
      <p v-else-if="preview === 'other'" class="m-0 text-sm text-grey-700">
        {{ $t({ en: 'No preview for this file type', zh: '此类型文件暂无预览' }) }}
        <code>{{ resource.file.name }}</code>
      </p>
    </div>
  </div>
</template>
