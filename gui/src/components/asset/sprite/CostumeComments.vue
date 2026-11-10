<script setup lang="ts">
import { nanoid } from 'nanoid'
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useContentSize } from '@/utils/dom'
import { useRenderableImage } from '@/utils/img-rendering'
import type { CostumeGen, CostumeEditComment } from '@/models/spx/gen/costume-gen'
import { UIButton, UIDropdown, UIIcon } from '@/components/ui'
import { useResourceWorkspace } from '@/components/editor/sprite/resource-workspace'

const vAutofocus = { mounted: (el: HTMLInputElement | HTMLTextAreaElement) => requestAnimationFrame(() => el.focus()) }

const props = defineProps<{
  gen: CostumeGen
  canvasArea?: { left: number; top: number; width: number; height: number } | null
}>()
const workspace = useResourceWorkspace()
const container = ref<HTMLElement | null>(null)
const size = useContentSize(container)
const [image] = useRenderableImage(() => props.gen.image)
const area = computed(() => {
  if (size.value == null || image.value == null) return null
  const { width, height } = props.canvasArea ?? size.value
  const scale = Math.min(width / image.value.naturalWidth, height / image.value.naturalHeight)
  const imageWidth = image.value.naturalWidth * scale
  const imageHeight = image.value.naturalHeight * scale
  return {
    left: (props.canvasArea?.left ?? 0) + (width - imageWidth) / 2,
    top: (props.canvasArea?.top ?? 0) + (height - imageHeight) / 2,
    width: imageWidth,
    height: imageHeight
  }
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
const editingIndex = computed(() => props.gen.editComments.findIndex((comment) => comment.id === draft.value?.id))
const isNew = computed(() => editingIndex.value === -1)
const draftNumber = computed(() => (isNew.value ? props.gen.editComments.length + 1 : editingIndex.value + 1))

watch(
  canvas,
  (el) => {
    if (showHint.value) el?.focus({ preventScroll: true })
  },
  { flush: 'post' }
)

function open(comment: CostumeEditComment) {
  draft.value = { ...comment }
}

defineExpose({ open })

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
  const id = draft.value?.id
  draft.value = null
  if (restoreFocus) nextTick(() => (markerButtons.get(id ?? '') ?? canvas.value)?.focus({ preventScroll: true }))
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
  <div
    v-show="workspace == null || workspace.activeTool.value === 'ai'"
    ref="container"
    class="absolute inset-0 pointer-events-none"
  >
    <div v-if="area != null" class="absolute" :style="areaStyle">
      <button
        ref="canvas"
        v-radar="{ name: 'Add local edit', desc: 'Click a point in the image to describe a local edit' }"
        type="button"
        class="absolute inset-0 h-full w-full cursor-crosshair border-none bg-transparent pointer-events-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-main"
        :aria-describedby="showHint ? hintId : undefined"
        @click="add"
      ></button>
      <button
        v-for="(comment, index) in gen.editComments"
        v-show="draft?.id !== comment.id"
        :key="comment.id"
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
        class="comment-marker absolute -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-grey-100 bg-primary-main text-sm font-medium text-grey-100 shadow-sm cursor-pointer pointer-events-auto hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-main"
        :style="position(comment)"
        :title="comment.content"
        :aria-expanded="false"
        @click.stop="open(comment)"
      >
        {{ index + 1 }}
      </button>
      <UIDropdown
        v-if="draft != null"
        :key="draft.id"
        trigger="manual"
        placement="right"
        :offset="{ x: 8, y: 0 }"
        :class="['border border-border', isNew ? 'rounded-full' : 'rounded-lg']"
        :visible="workspace == null || (workspace.selected.value && workspace.activeTool.value === 'ai')"
        @update:visible="
          (visible) => {
            if (!visible) close()
          }
        "
      >
        <template #trigger>
          <button
            v-radar="{ name: `Local edit ${draftNumber}`, desc: 'Close the edit instruction at this point' }"
            type="button"
            class="absolute -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-grey-100 bg-primary-main text-sm font-medium text-grey-100 shadow-sm cursor-pointer pointer-events-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-main"
            :style="position(draft)"
            :aria-expanded="true"
            @click.stop="close(true)"
          >
            {{ draftNumber }}
          </button>
        </template>
        <form
          v-radar="{ name: 'Local edit', desc: 'Describe the edit at this point' }"
          class="w-72 max-w-[calc(100vw-32px)] pointer-events-auto"
          :class="isNew ? 'flex items-center gap-2 p-1.5' : 'flex flex-col gap-3 p-3'"
          @submit.prevent="save"
          @keydown.esc.stop.prevent="close(true)"
          @keydown.ctrl.enter.prevent="save"
          @keydown.meta.enter.prevent="save"
        >
          <input
            v-if="isNew"
            v-model="draft.content"
            v-radar="{ name: 'Edit instruction', desc: 'Describe the change at the selected point' }"
            v-autofocus
            class="min-w-0 flex-1 h-8 border-none bg-transparent px-2.5 font-main text-sm text-text outline-none placeholder:text-hint-2"
            :placeholder="$t({ en: 'Describe the change here', zh: '描述这里的修改' })"
            @keydown.enter="($event as KeyboardEvent).isComposing && $event.preventDefault()"
          />
          <textarea
            v-else
            v-model="draft.content"
            v-radar="{ name: 'Edit instruction', desc: 'Describe the change at the selected point' }"
            v-autofocus
            class="block w-full h-16 resize-none border-none bg-transparent p-0 font-main text-sm text-text outline-none placeholder:text-hint-2"
            :placeholder="$t({ en: 'Describe the change here', zh: '描述这里的修改' })"
          ></textarea>
          <UIButton
            v-if="isNew"
            v-radar="{ name: 'Confirm local edit', desc: 'Save this instruction without generating an image' }"
            type="primary"
            shape="circle"
            html-type="submit"
            class="shrink-0"
            :disabled="draft.content.trim() === ''"
            :title="$t({ en: 'Done', zh: '确认' })"
          >
            <UIIcon type="check" class="h-4 w-4" />
          </UIButton>
          <div v-else class="flex items-center gap-2">
            <UIButton
              v-radar="{ name: 'Remove local edit', desc: 'Remove this instruction without changing the image' }"
              type="white"
              shape="square"
              class="border-transparent! mr-auto"
              :title="$t({ en: 'Remove edit', zh: '移除修改' })"
              @click="remove()"
            >
              <UIIcon type="trash" class="h-4 w-4" />
            </UIButton>
            <UIButton
              v-radar="{ name: 'Cancel local edit', desc: 'Keep the saved instruction' }"
              type="white"
              class="border-transparent!"
              @click="close(true)"
            >
              {{ $t({ en: 'Cancel', zh: '取消' }) }}
            </UIButton>
            <UIButton
              v-radar="{ name: 'Save local edit', desc: 'Save this instruction without generating an image' }"
              type="primary"
              html-type="submit"
              :disabled="draft.content.trim() === ''"
            >
              {{ $t({ en: 'Save', zh: '保存' }) }}
            </UIButton>
          </div>
        </form>
      </UIDropdown>
    </div>
    <div
      v-if="showHint"
      class="absolute inset-x-0 flex justify-center"
      :class="workspace == null ? (canvasArea != null ? 'bottom-36' : 'bottom-3') : null"
      :style="workspace != null && area != null ? { top: `${area.top + 12}px` } : null"
    >
      <span :id="hintId" role="status" class="rounded-md bg-grey-100 px-3 py-2 text-sm text-text shadow-sm">
        {{ $t({ en: 'Click where you want to make a change', zh: '点击图片中想修改的位置' }) }}
      </span>
    </div>
  </div>
</template>
