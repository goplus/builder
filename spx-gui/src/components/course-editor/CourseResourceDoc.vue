<script setup lang="ts">
/**
 * Purpose: The document shown for a resource package (`assets/<kind>/<name>/`). It previews the payload by
 * what it is (video, image, editable text, or "no preview"), lets the author rename the resource (the name is
 * what the course program refers to, e.g. `showVideo "name"`) and delete it. The resource is looked up from the
 * model by `kind` + `name` on every render, so it disappears (and the "does not exist" state shows) as soon as
 * it is removed elsewhere.
 *
 * Props:
 * - `project`: the author's working copy of the Tutorial project (resources are read and mutated on it).
 * - `kind`: the resource kind, i.e. the directory under `assets/` (`videos`, `images`, ...).
 * - `name`: the resource name, i.e. the package directory under `assets/<kind>/`.
 *
 * Emits:
 * - `renamed(path)`: the resource was renamed; carries its new package path (`assets/<kind>/<newName>`).
 *   Listened by `components/course-editor/CourseEditor.vue#template` (`@renamed="openPath"`), which navigates
 *   to the new path (the old one would resolve to `missing`).
 * - `deleted(path)`: the resource was removed; carries the path of its kind folder (`assets/<kind>`).
 *   Listened by `components/course-editor/CourseEditor.vue#template` (`@deleted="openPath"`).
 *
 * Used by: `components/course-editor/CourseEditor.vue#template` (when `doc.node.type === 'resource'`, keyed by
 * the package path so a different resource starts this component fresh).
 *
 * Uses: CourseTextDoc (text payloads), UIButton, UIEmpty, UITextInput, `useAsyncComputed` (object URL),
 * `useMessageHandle` (rename errors), `models/common/file#fromText` / `toText`, `course-tree.ts#getFileKind`,
 * `models/tutorial/resource.ts#getResourceKindDir` / `validateResourceName` / `videosKind`.
 */
import { computed, ref, watch } from 'vue'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useAsyncComputed } from '@/utils/utils'
import { fromText, toText } from '@/models/common/file'
import type { TutorialProject } from '@/models/tutorial/project'
import { getResourceKindDir, validateResourceLayout, videosKind } from '@/models/tutorial/resource'
import { UIButton, UIEmpty, UITextInput } from '@/components/ui'
import { getFileKind } from './course-tree'
import CourseTextDoc from './CourseTextDoc.vue'

/** A resource package: shown by what its payload is (video, image, text, other), renamed and deleted here. */
const props = defineProps<{
  /** The author's working copy of the Tutorial project. */
  project: TutorialProject
  /** Resource kind: the directory under `assets/`. */
  kind: string
  /** Resource name: the package directory under `assets/<kind>/`; also how the course program addresses it. */
  name: string
}>()

const emit = defineEmits<{
  /** The resource was renamed; carries its new path. */
  renamed: [path: string]
  /** The resource was removed; carries the path of its kind folder. */
  deleted: [path: string]
}>()

/**
 * The `Resource` instance for `kind` + `name`, or null when the model has none (removed, or a stale URL).
 * @returns The reactive `Resource`, or null.
 * Read by: `preview`, `fileUrl`, the text-loading watch, `handleTextChange`, `handleRename`, `handleDelete`,
 * `CourseResourceDoc.vue#template` (the "does not exist" branch and every `resource.` binding).
 * Called by: Vue (computed; re-evaluated when the props or the project's `resources` change)
 */
const resource = computed(() => props.project.getResource(props.kind, props.name))

/**
 * Which preview the payload gets: `'none'` without a resource, `'video'` for the videos kind or any video MIME
 * type, otherwise the file kind (`'text'` | `'image'` | `'other'`) derived from MIME type and file extension.
 * @returns One of `'none' | 'video' | 'text' | 'image' | 'other'`.
 * Read by: `fileUrl`, the text-loading watch, `CourseResourceDoc.vue#template` (preview branches).
 * Called by: Vue (computed; re-evaluated when `resource` or its `file` changes)
 */
const preview = computed(() => {
  const current = resource.value
  if (current == null) return 'none'
  // Videos are detected by kind (the course format's contract) or by MIME type (any other kind holding a video).
  if (props.kind === videosKind || current.file.type.startsWith('video/')) return 'video'
  // Everything else is classified like a plain file; the file name supplies the extension for text detection.
  return getFileKind(current.file, current.file.name)
})

/**
 * An object URL for the payload, only for previews that need one (video, image); null otherwise and while
 * loading (`useAsyncComputed` resets to null on re-evaluation). The `onCleanup` passed to `file.url()` revokes
 * the URL when the resource changes or the component unmounts.
 * @returns The URL string, or null.
 * Read by: `CourseResourceDoc.vue#template` (`<video :src>` / `<img :src>`).
 * Called by: Vue (`watchEffect` inside `useAsyncComputed`; re-run when `resource` or `preview` changes)
 */
const fileUrl = useAsyncComputed(async (onCleanup) => {
  const current = resource.value
  // No URL needed for text (loaded as a string) or unpreviewable files.
  if (current == null || (preview.value !== 'video' && preview.value !== 'image')) return null
  return current.file.url(onCleanup)
})

// Text payloads are loaded once per resource; edits produce new records without reloading the editor.
/**
 * The decoded text payload for `'text'` previews, or null while loading / for non-text payloads.
 * Written by: the watch below (load), `handleTextChange` (keeps it in step with the editor).
 * Read by: `CourseResourceDoc.vue#template` (`CourseTextDoc :text`, and its `v-else-if` guard).
 */
const text = ref<string | null>(null)
/**
 * Load the text payload when the resource identity (`kind`, `name`) changes. Watching the props rather than
 * `resource` means an edit (which replaces `resource.file`) does not reload and reset the editor. The result is
 * dropped if the resource changed while decoding.
 * @returns void; side effect: sets `text`.
 * Called by: Vue (watch on `[props.kind, props.name]`, immediate)
 */
watch(
  [() => props.kind, () => props.name],
  async () => {
    // Reset first so a stale text from the previous resource never shows under the new one.
    text.value = null
    const current = resource.value
    if (current == null || preview.value !== 'text') return
    const loaded = await toText(current.file)
    // Only apply if the resource is still the one we started decoding (guards against a fast re-navigation).
    if (resource.value === current) text.value = loaded
  },
  { immediate: true }
)

/**
 * The author edited the text payload: keep `text` in step and replace the resource's file with a new text record
 * under the same file name. The `File` instance changes, which is how `CourseEditor` detects the unsaved change.
 * @param next - The full new text from the editor.
 * @returns void; side effects: sets `text`, `resource.setFile(...)`.
 * Called by: `components/course-editor/CourseResourceDoc.vue#template` (`CourseTextDoc @update:text`)
 */
function handleTextChange(next: string) {
  const current = resource.value
  if (current == null) return
  text.value = next
  current.setFile(fromText(current.file.name, next))
}

/**
 * The draft name in the rename input; starts as the current name and is re-synced when the prop changes.
 * Written by: setup, the watch on `props.name` below, `CourseResourceDoc.vue#template` (`@update:value`).
 * Read by: `handleRename`, `CourseResourceDoc.vue#template` (input `:value`, Rename button `:disabled`).
 */
const nameInput = ref(props.name)
/**
 * Reset the draft when the resource name changes from outside (after a rename the parent navigates to the new
 * path, so `props.name` becomes the new name).
 * @param name - The new `props.name`.
 * @returns void; side effect: sets `nameInput`.
 * Called by: Vue (watch on `props.name`)
 */
watch(
  () => props.name,
  (name) => {
    nameInput.value = name
  }
)

/**
 * Apply the draft name: trim it, skip when unchanged, validate (non-blank, length, no `/`, unique within the
 * kind), rename the resource and tell the parent where the package now lives. A validation failure is thrown as
 * a `DefaultException` so `useMessageHandle` shows its message as the error toast.
 * @returns void; side effects: `resource.setName(...)`, emits `renamed`.
 * @throws DefaultException with the validation message when the new name is not acceptable.
 * Called by: `components/course-editor/CourseResourceDoc.vue#template` (name input `@keydown.enter`, Rename
 * button `@click`, both `handleRename.fn`)
 */
const handleRename = useMessageHandle(
  () => {
    const current = resource.value
    if (current == null) return
    // Normalize the draft; a no-op rename is silently ignored.
    const next = nameInput.value.trim()
    if (next === current.name) return
    // The package-layout guard: name shape, uniqueness within the kind, payload path clear of other records.
    const error = validateResourceLayout(
      { kind: props.kind, name: next, file: current.file, extraFiles: current.extraFiles },
      props.project
    )
    if (error != null) throw new DefaultException(error)
    // Rename, then let the parent navigate to the new package path.
    current.setName(next)
    emit('renamed', current.assetPath)
  },
  { en: 'Failed to rename resource', zh: '重命名资源失败' }
)

/**
 * Delete button: remove the resource from the model (no confirmation; the course is not saved until the author
 * saves) and tell the parent to open the kind folder instead.
 * @returns void; side effects: `project.removeResource(id)`, emits `deleted`.
 * Called by: `components/course-editor/CourseResourceDoc.vue#template` (Delete button `@click`)
 */
function handleDelete() {
  const current = resource.value
  if (current == null) return
  props.project.removeResource(current.id)
  emit('deleted', getResourceKindDir(props.kind))
}
</script>

<template>
  <!-- Missing resource: the model has no `kind/name` (deleted, renamed elsewhere, or a stale URL). -->
  <UIEmpty v-if="resource == null" class="m-auto" size="small">
    {{ $t({ en: `Resource "${kind}/${name}" does not exist`, zh: `资源“${kind}/${name}”不存在` }) }}
  </UIEmpty>
  <!-- Resource document: header row, a reference hint, and the preview area filling the rest. -->
  <div v-else class="flex h-full flex-col gap-3 overflow-hidden p-4">
    <!-- Header row: kind prefix, the editable name, Rename (disabled while the draft equals the name), Delete. -->
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
    <!-- Reference hint: videos show the `showVideo` call that addresses them by name... -->
    <p v-if="kind === videosKind" class="m-0 flex-none text-sm text-grey-700">
      {{ $t({ en: 'Referenced from the course program as', zh: '课程程序里这样引用它：' }) }}
      <code>showVideo "{{ resource.name }}"</code>
    </p>
    <!-- ...other kinds cannot be addressed by the course program yet; the package is only kept with the course. -->
    <p v-else class="m-0 flex-none text-sm text-grey-700">
      {{
        $t({
          en: `The course program cannot address ${kind} resources yet; the package is kept with the course.`,
          zh: `课程程序目前还不能引用 ${kind} 资源，这个包会随课程保存。`
        })
      }}
    </p>
    <!-- Preview area, by `preview`: a video player, an image, an editable text editor, or a "no preview" note.
         Video and image wait for `fileUrl`; text waits for `text` to be decoded. -->
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
      <!-- Text payload: plain-text Monaco editor; edits flow back through `handleTextChange`. -->
      <CourseTextDoc
        v-else-if="preview === 'text' && text != null"
        :text="text"
        language="plaintext"
        @update:text="handleTextChange"
      />
      <!-- Unpreviewable payload: just name the file. -->
      <p v-else-if="preview === 'other'" class="m-0 text-sm text-grey-700">
        {{ $t({ en: 'No preview for this file type', zh: '此类型文件暂无预览' }) }}
        <code>{{ resource.file.name }}</code>
      </p>
    </div>
  </div>
</template>
