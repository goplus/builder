<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useAsyncComputed } from '@/utils/utils'
import type { TutorialProject } from '@/models/tutorial/project'
import { validateVideoName } from '@/models/tutorial/video'
import { UIButton, UIEmpty, UITextInput } from '@/components/ui'

const props = defineProps<{
  project: TutorialProject
  name: string
}>()

const emit = defineEmits<{
  renamed: [name: string]
  deleted: []
}>()

const video = computed(() => props.project.videos.find((v) => v.name === props.name) ?? null)

const videoUrl = useAsyncComputed(async (onCleanup) => {
  const current = video.value
  if (current == null) return null
  return current.file.url(onCleanup)
})

const nameInput = ref(props.name)
watch(
  () => props.name,
  (name) => {
    nameInput.value = name
  }
)

const handleRename = useMessageHandle(
  () => {
    const current = video.value
    if (current == null) return
    const next = nameInput.value.trim()
    if (next === current.name) return
    const error = validateVideoName(next, props.project)
    if (error != null) throw new DefaultException(error)
    current.setName(next)
    emit('renamed', next)
  },
  { en: 'Failed to rename video', zh: '重命名视频失败' }
)

function handleDelete() {
  const current = video.value
  if (current == null) return
  props.project.removeVideo(current.id)
  emit('deleted')
}
</script>

<template>
  <UIEmpty v-if="video == null" class="m-auto" size="small">
    {{ $t({ en: `Video "${name}" does not exist`, zh: `视频“${name}”不存在` }) }}
  </UIEmpty>
  <div v-else class="flex h-full flex-col gap-3 overflow-y-auto p-4">
    <div class="flex items-center gap-2">
      <UITextInput
        v-radar="{ name: 'Video name input', desc: 'Input for the video name used by the course program' }"
        class="flex-1"
        :value="nameInput"
        @update:value="(v) => (nameInput = v)"
        @keydown.enter="handleRename.fn"
      />
      <UIButton
        v-radar="{ name: 'Rename video button', desc: 'Click to apply the new video name' }"
        type="secondary"
        size="small"
        :disabled="nameInput.trim() === video.name"
        @click="handleRename.fn"
      >
        {{ $t({ en: 'Rename', zh: '重命名' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'Delete video button', desc: 'Click to remove this video from the course' }"
        type="neutral"
        size="small"
        @click="handleDelete"
      >
        {{ $t({ en: 'Delete', zh: '删除' }) }}
      </UIButton>
    </div>
    <p class="m-0 text-sm text-grey-700">
      {{ $t({ en: 'Referenced from the course program as', zh: '课程程序里这样引用它：' }) }}
      <code>showVideo "{{ video.name }}"</code>
    </p>
    <video v-if="videoUrl != null" class="max-h-[60vh] w-full rounded bg-black" :src="videoUrl" controls></video>
  </div>
</template>
