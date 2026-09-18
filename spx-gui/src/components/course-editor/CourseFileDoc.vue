<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useAsyncComputed } from '@/utils/utils'
import { extname } from '@/utils/path'
import { fromText, toText, type File } from '@/models/common/file'
import type { TutorialProject } from '@/models/tutorial/project'
import { UIButton, UITag } from '@/components/ui'
import type { FileNode } from './course-tree'
import CourseTextDoc from './CourseTextDoc.vue'

/**
 * A record the course format gives no role to. It is shown by its kind (text, image, other) and kept as it is when
 * the course is saved; the author can edit text and delete any of them.
 *
 * Purpose: the document for a plain `FileNode` (an entry of `TutorialProject.extraFiles`). Text records open in
 * `CourseTextDoc` and every edit writes a new `File` back into `extraFiles`; images are previewed from an object
 * URL; other records only show their MIME type. Deleting removes the record from `extraFiles`. The course program
 * (`main_course.gox`) is also a `FileNode` but never reaches this component: `CourseEditor.vue` routes it to
 * `CourseTextDoc` directly.
 *
 * Props:
 * - `project`: the loaded Tutorial project; `setExtraFile` / `removeExtraFile` are called on it.
 * - `node`: the open `FileNode` (`path`, `name`, `file`, `kind`). `CourseEditor.vue` keys this component by
 *   `node.path`, so a given instance always shows the same path; the `file` may change after an edit.
 *
 * Emits:
 * - `deleted`: no payload; the record is gone. `CourseEditor.vue` navigates to the nearest existing ancestor
 *   (`@deleted="openPath(nearestExistingPath(tree, dirname(activePath)))"`).
 *
 * Used by:
 * - components/course-editor/CourseEditor.vue#template (the final `v-else` document branch, keyed by path)
 *
 * Uses:
 * - components/course-editor/CourseTextDoc.vue (Monaco text editing)
 * - components/ui UIButton, UITag
 * - models/common/file (toText, fromText), utils/utils#useAsyncComputed, utils/exception#useMessageHandle
 */
const props = defineProps<{
  project: TutorialProject
  node: FileNode
}>()

const emit = defineEmits<{
  deleted: []
}>()

// Text follows the record's `File`: reloaded when it is replaced from outside, left alone for the document's own
// edits (which also produce new `File` records, and must not reset the editor under the author).
/** The decoded text of a text record; `null` while loading and for non-text records. */
const text = ref<string | null>(null)
/**
 * The `File` this document last wrote itself (see `handleTextChange`). Its arrival through `props.node.file` is an
 * echo of the author's own edit, which must not reload the editor; any other `File` is an outside replacement.
 */
let lastWrittenFile: File | null = null

/**
 * Load the text of the record, again whenever the record's `File` is replaced from outside. The document is keyed
 * by path, so an upload that replaces the record at this same path neither remounts it nor changes the path:
 * watching only the path left the old text in the editor, and the next keystroke wrote it back over the upload.
 * @returns void; side effects: resets and then sets `text`.
 * Called by: Vue (watch on `props.node.file`, immediate)
 */
watch(
  () => props.node.file,
  async (file) => {
    // Our own edit coming back through the model: the editor already shows it.
    if (file === lastWrittenFile) return
    // Reset first, so nothing can be typed into the old text while the new one loads.
    text.value = null
    // Only text records are decoded; images and others never populate `text`.
    if (props.node.kind !== 'text') return
    const loaded = await toText(file)
    // Drop the result if the record was replaced again meanwhile.
    if (props.node.file === file) text.value = loaded
  },
  { immediate: true }
)

/**
 * Monaco language id for syntax highlighting, chosen by extension. `CourseTextDoc` falls back to plain text when
 * the loaded Monaco does not know the id.
 *
 * @param path - The record's path (only its extension is read).
 * @returns `'xgo'` for `.gox`/`.spx`, `'json'` for `.json`, `'plaintext'` otherwise.
 *
 * Called by:
 * - components/course-editor/CourseFileDoc.vue#template (the `language` prop of `CourseTextDoc`)
 */
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

/**
 * Apply an edit from the text editor: keep the local copy in sync and write a new `File` record into
 * `extraFiles` at the same path. The new record is what gets saved and what marks the node as changed.
 *
 * @param next - The full text after the edit.
 * @returns Nothing; mutates `text` and the record at `node.path` in `project.extraFiles`.
 * @throws Error from `setExtraFile` if the path has become claimed by the model (not expected for an extra file).
 *
 * Called by:
 * - components/course-editor/CourseFileDoc.vue#template (`@update:text` of `CourseTextDoc`)
 */
function handleTextChange(next: string) {
  text.value = next
  const file = fromText(props.node.name, next)
  // Remember it, so the watch recognizes the echo of this edit.
  lastWrittenFile = file
  props.project.setExtraFile(props.node.path, file)
}

/**
 * Object URL of an image record for the `<img>` preview; `null` for other kinds and while loading. Re-evaluated
 * when `node.kind` or `node.file` changes; the previous URL is revoked through `onCleanup`.
 *
 * @returns A shallow ref holding the blob URL or `null`.
 *
 * Called by:
 * - components/course-editor/CourseFileDoc.vue#template (`src` of the image preview)
 */
const imageUrl = useAsyncComputed(async (onCleanup) => {
  if (props.node.kind !== 'image') return null
  return props.node.file.url(onCleanup)
})

/**
 * Remove the record from the course and tell the parent so it can navigate away from the now-missing path.
 * `useMessageHandle` shows an error toast should `removeExtraFile` throw (record already gone).
 *
 * @returns A `useMessageHandle` wrapper; `fn()` performs the deletion and emits `deleted`.
 *
 * Called by:
 * - components/course-editor/CourseFileDoc.vue#template (the Delete button)
 */
const handleDelete = useMessageHandle(
  () => {
    props.project.removeExtraFile(props.node.path)
    emit('deleted')
  },
  { en: 'Failed to delete file', zh: '删除文件失败' }
)
</script>

<template>
  <!-- Fixed-height document: header on top, the preview/editor fills the rest without overflowing the card. -->
  <div class="flex h-full flex-col gap-3 overflow-hidden p-4">
    <!-- Header: the record's path, the "unused by the course" tag (every record here is unclaimed) and Delete. -->
    <div class="flex flex-none items-center gap-2">
      <h2 class="m-0 min-w-0 flex-1 truncate text-base font-semibold" :title="node.path">{{ node.path }}</h2>
      <UITag color="warning">{{ $t({ en: 'The course does not use this file', zh: '课程不会使用此文件' }) }}</UITag>
      <UIButton
        v-radar="{ name: 'delete-button', desc: 'Click to remove this file from the course' }"
        type="neutral"
        size="small"
        @click="handleDelete.fn"
      >
        {{ $t({ en: 'Delete', zh: '删除' }) }}
      </UIButton>
    </div>
    <!-- Body, chosen by kind. Text and image render nothing until their content is ready. -->
    <div class="min-h-0 flex-1">
      <!-- Text record, once decoded: Monaco editor; edits go through handleTextChange. -->
      <CourseTextDoc
        v-if="node.kind === 'text' && text != null"
        :text="text"
        :language="languageOf(node.path)"
        @update:text="handleTextChange"
      />
      <!-- Image record, once its object URL is ready: inline preview. -->
      <img
        v-else-if="node.kind === 'image' && imageUrl != null"
        class="max-h-full max-w-full rounded border border-line"
        :src="imageUrl"
        :alt="node.name"
      />
      <!-- Any other record: no preview, just the MIME type when known. -->
      <p v-else-if="node.kind === 'other'" class="m-0 text-sm text-grey-700">
        {{ $t({ en: 'No preview for this file type', zh: '此类型文件暂无预览' }) }}
        <code v-if="node.file.type !== ''">{{ node.file.type }}</code>
      </p>
    </div>
  </div>
</template>
