<script setup lang="ts">
import { nanoid } from 'nanoid'
import { computed, nextTick, ref, useId, watch } from 'vue'
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
const hintId = useId()
const showHint = computed(() => props.gen.editComments.length === 0 && draft.value == null)
const markerButtons = new Map<string, HTMLButtonElement>()
let returnFocus: HTMLButtonElement | null = null

watch(
  canvas,
  (el) => {
    if (showHint.value) el?.focus({ preventScroll: true })
  },
  { flush: 'post' }
)

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
        v-radar="{ name: 'Add local edit', desc: 'Click a point in the image to describe a local edit' }"
        type="button"
        class="absolute inset-0 h-full w-full cursor-crosshair border-none bg-transparent pointer-events-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-main"
        :class="showHint ? 'outline-2 -outline-offset-2 outline-primary-main' : ''"
        :aria-describedby="showHint ? hintId : undefined"
        @click="add"
      ></button>
      <div
        v-for="(comment, index) in gen.editComments"
        v-show="draft?.id !== comment.id"
        :key="comment.id"
        class="comment-chip group isolate absolute pointer-events-auto"
        :class="[
          comment.x > 0.5 ? '-translate-x-full' : '',
          comment.y < 0.05 ? '' : comment.y > 0.95 ? '-translate-y-full' : '-translate-y-1/2'
        ]"
        :style="{
          ...position(comment),
          left: `min(${comment.x * 100}%, calc(100% - 28px))`,
          maxWidth: `min(160px, calc(${Math.max(comment.x, 1 - comment.x) * 100}% - 28px))`
        }"
      >
        <button
          :ref="
            (el) => {
              if (el != null) markerButtons.set(comment.id, el as HTMLButtonElement)
              else markerButtons.delete(comment.id)
            }
          "
          v-radar="{
            name: `Local edit ${index + 1}: ${comment.content}`,
            desc: 'Update the edit instruction at this point'
          }"
          type="button"
          class="comment-marker relative block max-w-full rounded-md border-none bg-transparent px-2 py-1.5 text-xs text-text cursor-pointer hover:text-primary-main active:bg-grey-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-main"
          :title="comment.content"
          @click.stop="open(comment)"
        >
          <span class="block truncate">{{ comment.content }}</span>
          <span
            aria-hidden="true"
            class="absolute z-1 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-grey-100 bg-primary-main group-hover:opacity-0 group-focus-within:opacity-0"
            :style="{
              left: comment.x > 0.5 ? `calc(100% + ${Math.max(0, 28 - (1 - comment.x) * area.width)}px)` : '0',
              top: comment.y < 0.05 ? '0' : comment.y > 0.95 ? '100%' : '50%'
            }"
          ></span>
        </button>
        <button
          v-radar="{ name: `Remove local edit ${index + 1}`, desc: 'Remove the edit instruction at this point' }"
          type="button"
          class="absolute inset-y-0 start-full w-7 flex items-center justify-center rounded-md border-none bg-transparent text-text cursor-pointer opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto hover:text-primary-main active:bg-grey-300 focus-visible:outline-2 focus-visible:outline-primary-main"
          :title="$t({ en: 'Remove edit', zh: '移除修改' })"
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
            ><UIIcon type="position" class="h-4 w-4"
          /></span>
        </template>
        <form
          v-radar="{ name: 'Local edit', desc: 'Describe the edit at this point' }"
          class="w-72 max-w-[calc(100vw-32px)] flex flex-col gap-3 p-3 pointer-events-auto"
          @submit.prevent="save"
          @keydown.esc.stop.prevent="close(true)"
          @keydown.ctrl.enter.prevent="save"
          @keydown.meta.enter.prevent="save"
        >
          <label class="block">
            <span class="sr-only">{{ $t({ en: 'Edit instruction', zh: '修改要求' }) }}</span>
            <textarea
              :key="draft.id"
              v-model="draft.content"
              v-radar="{ name: 'Edit instruction', desc: 'Describe the change at the selected point' }"
              v-autofocus
              class="block w-full h-16 resize-none border-none bg-transparent p-0 text-sm text-text outline-none placeholder:text-hint-2"
              :placeholder="$t({ en: 'Describe the change here', zh: '描述这里的修改' })"
            ></textarea>
          </label>
          <div class="flex items-center justify-between">
            <UIButton
              v-radar="{ name: 'Remove local edit', desc: 'Remove this instruction without changing the image' }"
              type="white"
              shape="square"
              class="border-transparent!"
              :title="$t({ en: 'Remove edit', zh: '移除修改' })"
              @click="remove()"
              ><UIIcon type="trash" class="h-4 w-4"
            /></UIButton>
            <UIButton
              v-radar="{ name: 'Confirm local edit', desc: 'Save this instruction without generating an image' }"
              type="primary"
              shape="circle"
              html-type="submit"
              :disabled="draft.content.trim() === ''"
              :title="$t({ en: 'Done', zh: '确认' })"
              ><UIIcon type="check" class="h-4 w-4"
            /></UIButton>
          </div>
        </form>
      </UIDropdown>
    </div>
    <div v-if="showHint" class="absolute inset-x-0 bottom-3 flex justify-center">
      <span :id="hintId" role="status" class="rounded-md bg-grey-100 px-3 py-2 text-sm text-text shadow-sm">
        {{ $t({ en: 'Click where you want to make a change', zh: '点击图片中想修改的位置' }) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.comment-chip::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  border-radius: var(--ui-border-radius-md);
  background: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-sm);
}

.comment-chip:hover::before,
.comment-chip:focus-within::before {
  inset-inline-end: -28px;
}

@media (prefers-contrast: more) {
  .comment-chip::before {
    outline: 1px solid var(--ui-color-grey-900);
  }
}
</style>
