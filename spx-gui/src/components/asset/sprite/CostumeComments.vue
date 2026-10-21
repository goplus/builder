<script setup lang="ts">
import { nanoid } from 'nanoid'
import { computed, nextTick, ref, watch } from 'vue'
import { useContentSize } from '@/utils/dom'
import { useRenderableImage } from '@/utils/img-rendering'
import type { CostumeGen, CostumeEditComment } from '@/models/spx/gen/costume-gen'
import { UIButton, UIDropdown, UIIcon } from '@/components/ui'

const vAutofocus = { mounted: (el: HTMLTextAreaElement) => requestAnimationFrame(() => el.focus()) }

const props = defineProps<{ gen: CostumeGen }>()
const container = ref<HTMLElement | null>(null)
const size = useContentSize(container)
const [image] = useRenderableImage(() => props.gen.image)
const area = computed(() => {
  if (size.value == null || image.value == null) return null
  const { width, height } = size.value
  const scale = Math.min(width / image.value.naturalWidth, height / image.value.naturalHeight)
  const imageWidth = image.value.naturalWidth * scale
  const imageHeight = image.value.naturalHeight * scale
  return { left: (width - imageWidth) / 2, top: (height - imageHeight) / 2, width: imageWidth, height: imageHeight }
})
const areaStyle = computed(() => {
  if (area.value == null) return null
  return Object.fromEntries(Object.entries(area.value).map(([key, value]) => [key, `${value}px`]))
})
const draft = ref<CostumeEditComment | null>(null)
const canvas = ref<HTMLButtonElement | null>(null)
const markerButtons = new Map<string, HTMLButtonElement>()
let returnFocus: HTMLButtonElement | null = null

function open(comment: CostumeEditComment) {
  returnFocus = markerButtons.get(comment.id) ?? canvas.value
  draft.value = { ...comment }
}

function add(event: MouseEvent) {
  const target = event.currentTarget as HTMLButtonElement
  const rect = target.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return
  open({
    id: nanoid(),
    x: event.detail === 0 ? 0.5 : Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: event.detail === 0 ? 0.5 : Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    content: ''
  })
}

function close(restoreFocus = false) {
  draft.value = null
  if (restoreFocus) nextTick(() => returnFocus?.focus())
}

function save() {
  if (draft.value == null || draft.value.content.trim() === '') return
  const comment = { ...draft.value, content: draft.value.content.trim() }
  const comments = props.gen.editComments
  props.gen.setEditComments(
    comments.some((item) => item.id === comment.id)
      ? comments.map((item) => (item.id === comment.id ? comment : item))
      : [...comments, comment]
  )
  close(true)
}

function remove(id = draft.value?.id) {
  props.gen.setEditComments(props.gen.editComments.filter((comment) => comment.id !== id))
  returnFocus = canvas.value
  close(true)
}

watch(
  () => props.gen,
  () => (draft.value = null)
)

function position(comment: CostumeEditComment) {
  return { left: `${comment.x * 100}%`, top: `${comment.y * 100}%` }
}
</script>

<template>
  <div ref="container" class="absolute inset-0 pointer-events-none">
    <div v-if="area != null" class="absolute" :style="areaStyle">
      <button
        ref="canvas"
        v-radar="{ name: 'Add image comment', desc: 'Click a point in the image to describe a local edit' }"
        type="button"
        class="absolute inset-0 h-full w-full cursor-crosshair border-none bg-transparent pointer-events-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-main"
        @click="add"
      ></button>
      <div
        v-for="(comment, index) in gen.editComments"
        v-show="draft?.id !== comment.id"
        :key="comment.id"
        class="group absolute pointer-events-auto"
        :class="[
          comment.x > 0.5 ? '-translate-x-full' : '',
          comment.y < 0.05 ? '' : comment.y > 0.95 ? '-translate-y-full' : '-translate-y-1/2'
        ]"
        :style="{ ...position(comment), maxWidth: `min(160px, ${Math.max(comment.x, 1 - comment.x) * 100}%)` }"
      >
        <button
          :ref="
            (el) => {
              if (el != null) markerButtons.set(comment.id, el as HTMLButtonElement)
              else markerButtons.delete(comment.id)
            }
          "
          v-radar="{ name: `Comment ${index + 1}: ${comment.content}`, desc: 'Edit this image comment' }"
          type="button"
          class="comment-marker block max-w-full truncate rounded-md border-none bg-grey-100/95 px-2 py-1.5 text-xs text-text shadow-sm cursor-pointer transition-colors duration-150 hover:bg-primary-100 hover:text-primary-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-main"
          :title="comment.content"
          @click.stop="open(comment)"
        >
          {{ comment.content }}
        </button>
        <button
          v-radar="{ name: `Delete comment ${index + 1}`, desc: 'Delete this image comment' }"
          type="button"
          class="absolute inset-y-0 w-7 flex items-center justify-center rounded-md border-none bg-grey-100/95 text-text shadow-sm cursor-pointer opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto hover:bg-grey-300 focus-visible:outline-2 focus-visible:outline-primary-main"
          :class="comment.x * area.width < 28 ? 'start-full' : 'end-full'"
          :title="$t({ en: 'Delete comment', zh: '删除注释' })"
          @click.stop="remove(comment.id)"
        >
          <UIIcon type="close" class="h-4 w-4" />
        </button>
      </div>
      <UIDropdown
        v-if="draft != null"
        :key="draft.id"
        trigger="manual"
        class="rounded-lg!"
        :visible="true"
        @update:visible="
          (visible) => {
            if (!visible) close()
          }
        "
      >
        <template #trigger>
          <span
            class="absolute -translate-x-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full border-2 border-grey-100 bg-primary-main text-grey-100 shadow-sm"
            :style="position(draft)"
            ><UIIcon type="comment" class="h-4 w-4"
          /></span>
        </template>
        <form
          v-radar="{ name: 'Image comment', desc: 'Describe the edit at this point' }"
          class="w-72 max-w-[calc(100vw-32px)] flex flex-col gap-3 p-3 pointer-events-auto"
          @submit.prevent="save"
          @keydown.esc.stop.prevent="close(true)"
          @keydown.ctrl.enter.prevent="save"
          @keydown.meta.enter.prevent="save"
        >
          <label class="block">
            <span class="sr-only">{{ $t({ en: 'Comment', zh: '注释' }) }}</span>
            <textarea
              :key="draft.id"
              v-model="draft.content"
              v-radar="{ name: 'Comment text', desc: 'Describe the change at the selected point' }"
              v-autofocus
              class="block w-full h-16 resize-none border-none bg-transparent p-0 text-sm text-text outline-none placeholder:text-hint-2"
              :placeholder="$t({ en: 'Describe the change here', zh: '描述这里的修改' })"
            ></textarea>
          </label>
          <div class="flex items-center justify-between">
            <UIButton
              v-radar="{ name: 'Delete comment', desc: 'Remove this comment without changing the image' }"
              type="white"
              shape="square"
              class="border-transparent!"
              :title="$t({ en: 'Delete comment', zh: '删除注释' })"
              @click="remove()"
              ><UIIcon type="trash" class="h-4 w-4"
            /></UIButton>
            <UIButton
              v-radar="{ name: 'Save comment', desc: 'Save this comment without generating an image' }"
              type="primary"
              shape="circle"
              html-type="submit"
              :disabled="draft.content.trim() === ''"
              :title="$t({ en: 'Save comment', zh: '保存注释' })"
              ><UIIcon type="check" class="h-4 w-4"
            /></UIButton>
          </div>
        </form>
      </UIDropdown>
    </div>
    <div class="absolute inset-x-0 bottom-3 flex justify-center">
      <span class="rounded-md bg-grey-100 px-3 py-1.5 text-xs text-hint-1 shadow-sm">
        {{ $t({ en: 'Click the image to add a comment', zh: '点击图片，添加注释' }) }}
      </span>
    </div>
  </div>
</template>
