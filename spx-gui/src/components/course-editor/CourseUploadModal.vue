<script lang="ts">
import type { CourseNode } from './course-tree'

/**
 * Directories of the tree that accept uploads, in tree order; the course root comes first. Walks every folder
 * node depth-first (parents before children, siblings in the tree's sorted order) and keeps the ones `accepts`
 * approves. Only folders count: files, packages and the project are not upload targets.
 *
 * @param nodes - Siblings to walk; the tree's top level or a folder's `children`.
 * @param accepts - The policy; `validateUploadDir(...) == null` in practice.
 * @param into - Accumulator shared across the recursion; callers leave it at the default.
 * @returns `into`, with every accepted folder path appended. The root (`''`) is not a node, so it is not
 *   collected here; the caller prepends it.
 *
 * Called by:
 * - components/course-editor/CourseUploadModal.vue#knownDirs
 * - components/course-editor/CourseUploadModal.vue#collectUploadDirs (recursively)
 */
function collectUploadDirs(nodes: CourseNode[], accepts: (dir: string) => boolean, into: string[] = []) {
  for (const node of nodes) {
    if (node.type !== 'folder') continue
    // Record the folder itself, then keep walking: a refused folder may still contain accepted ones
    // (`assets` refuses, `assets/videos` accepts).
    if (accepts(node.path)) into.push(node.path)
    collectUploadDirs(node.children, accepts, into)
  }
  return into
}
</script>

<script setup lang="ts">
/**
 * Modal for uploading files into the course, opened programmatically with `useModal(CourseUploadModal)`. The
 * author picks native files and a target directory (from the folders the tree already has, or typed freely); the
 * upload policy of `./upload.ts` decides whether the combination is allowed and what it will produce (a package
 * per file under `assets/<kind>`, plain records elsewhere, replacing existing ones). The modal does not touch the
 * project: it resolves with the choice and `CourseEditor.vue` performs the upload.
 *
 * Props:
 * - `visible`: whether the modal is shown; set by `UIModalProvider` (true after mount, false while closing).
 * - `project`: the loaded Tutorial project, read by the validation helpers (project root, claimed paths, extras).
 * - `tree`: the current course tree, used to list the existing folders as clickable targets.
 * - `initialDir`: the directory proposed as the target (the open folder, or the folder of the open node).
 *
 * Emits:
 * - `cancelled`: the author closed the modal (close button, mask or Cancel). `UIModalProvider` rejects the
 *   `openUploadModal(...)` promise with `Cancelled`, which `useMessageHandle` in `CourseEditor.vue` swallows.
 * - `resolved`: payload `{ dir, files }`, the normalized target directory and the chosen native files.
 *   `UIModalProvider` resolves the promise awaited in `CourseEditor.vue#handleUpload`.
 *
 * Used by:
 * - components/course-editor/CourseEditor.vue#handleUpload (via `useModal(CourseUploadModal)`)
 *
 * Uses:
 * - components/ui UIFormModal, UIButton, UITextInput
 * - models/common/cloud#selectFilesWithUploadLimit (native file picker plus the upload size limit check)
 * - components/course-editor/upload.ts (normalizeDir, validateUploadDir, validateUploadPath, getUploadConflicts,
 *   getUploadResourceKind)
 */
import { computed, ref, shallowRef } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { selectFilesWithUploadLimit } from '@/models/common/cloud'
import type { TutorialProject } from '@/models/tutorial/project'
import { UIButton, UIFormModal, UITextInput } from '@/components/ui'
import {
  getUploadConflicts,
  getUploadResourceKind,
  normalizeDir,
  validateUploadDir,
  validateUploadPath
} from './upload'

const props = defineProps<{
  visible: boolean
  project: TutorialProject
  tree: CourseNode[]
  /** Directory proposed as the target. */
  initialDir: string
}>()

const emit = defineEmits<{
  cancelled: []
  /** Resolves with the files to upload and the chosen target directory (normalized). */
  resolved: [result: { dir: string; files: globalThis.File[] }]
}>()

/** The native files chosen so far; replaced wholesale by each selection (`shallowRef`: the array is never mutated). */
const files = shallowRef<globalThis.File[]>([])

/**
 * Open the native file picker and keep the chosen files. `selectFilesWithUploadLimit` rejects when a file exceeds
 * the upload size limit; `useMessageHandle` turns that into an error toast and exposes `isLoading` for the button.
 * Cancelling the picker rejects with `Cancelled`, which is silently swallowed.
 *
 * @returns A `useMessageHandle` wrapper: `fn()` runs the selection, `isLoading` is true while the picker is open.
 *
 * Called by:
 * - components/course-editor/CourseUploadModal.vue#template (the "Select files..." button)
 */
const handleSelectFiles = useMessageHandle(
  async () => {
    files.value = await selectFilesWithUploadLimit({})
  },
  { en: 'Failed to select files', zh: '选择文件失败' }
)

/** The target directory as typed or clicked; starts from the proposed one. */
const dirInput = ref(props.initialDir)
/**
 * The normalized target directory (`normalizeDir`), which the policy checks and the emitted result use.
 *
 * @returns `dirInput` without leading/trailing/duplicate slashes; `''` for the course root.
 *
 * Called by:
 * - components/course-editor/CourseUploadModal.vue#error, #conflicts, #packageKind
 * - components/course-editor/CourseUploadModal.vue#template (highlighting the active folder; the Upload button)
 */
const dir = computed(() => normalizeDir(dirInput.value))

/**
 * Folders offered as one-click targets: the course root plus every folder of the tree that accepts uploads
 * (`validateUploadDir`), in tree order.
 *
 * @returns Normalized directory paths; `''` first.
 *
 * Called by:
 * - components/course-editor/CourseUploadModal.vue#template (the folder list)
 */
const knownDirs = computed(() => [
  '',
  ...collectUploadDirs(props.tree, (candidate) => validateUploadDir(props.project, candidate) == null)
])

// The first problem found, if any; the directory rule comes before per-file rules.
/**
 * The first reason the current directory/files combination is refused, or null. Recomputed whenever the
 * directory or the file list changes; disables the Upload button and is shown in red.
 *
 * @returns A `LocaleMessage` from `validateUploadDir` or `validateUploadPath`, or `null` when everything passes.
 *
 * Called by:
 * - components/course-editor/CourseUploadModal.vue#conflicts, #packageKind
 * - components/course-editor/CourseUploadModal.vue#template (the message area; the Upload button's `disabled`)
 */
const error = computed(() => {
  // A refused directory refuses everything, so check it once rather than per file.
  const dirError = validateUploadDir(props.project, dir.value)
  if (dirError != null) return dirError
  // Then each file's own path (fixed-path or claimed records).
  for (const file of files.value) {
    const pathError = validateUploadPath(props.project, dir.value, file.name)
    if (pathError != null) return pathError
  }
  return null
})

/**
 * Existing plain records the upload would replace, for the yellow warning. Empty while there is an error (the
 * warning would be misleading) and for package targets (packages get fresh names).
 *
 * @returns Paths from `getUploadConflicts`, or `[]`.
 *
 * Called by:
 * - components/course-editor/CourseUploadModal.vue#template (the "Existing files will be replaced" message)
 */
const conflicts = computed(() =>
  error.value == null
    ? getUploadConflicts(
        props.project,
        dir.value,
        files.value.map((file) => file.name)
      )
    : []
)

/**
 * The resource kind the files will be packaged as when the target is `assets/<kind>`, for the explanatory
 * message. Null for plain-record targets and while there is an error.
 *
 * @returns The kind from `getUploadResourceKind`, or `null`.
 *
 * Called by:
 * - components/course-editor/CourseUploadModal.vue#template (the "Each file becomes a ... package" message)
 */
const packageKind = computed(() => (error.value == null ? getUploadResourceKind(dir.value) : null))

/**
 * Display label of a folder candidate; the root has no name of its own and is shown as `/`.
 *
 * @param candidate - A normalized directory from `knownDirs`.
 * @returns `/` for the root, otherwise the path itself.
 *
 * Called by:
 * - components/course-editor/CourseUploadModal.vue#template (folder buttons and their radar names)
 */
function dirLabel(candidate: string) {
  return candidate === '' ? '/' : candidate
}
</script>

<template>
  <!--
    The modal shell. `visible` comes from UIModalProvider; closing it by any means (mask click, close button)
    emits `cancelled`, which rejects the promise awaited in CourseEditor.vue#handleUpload.
  -->
  <UIFormModal
    :radar="{ name: 'Upload files modal', desc: 'Choose where uploaded files go in the course' }"
    :title="$t({ en: 'Upload files', zh: '上传文件' })"
    :visible="visible"
    style="width: 640px"
    @update:visible="emit('cancelled')"
  >
    <div class="flex flex-col gap-4 text-sm">
      <!-- Files section: the picker button and the list of chosen file names. -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-3">
          <span class="text-grey-700">{{ $t({ en: 'Files', zh: '文件' }) }}</span>
          <!-- Opens the native picker; the label switches once files are chosen; busy while the picker is open. -->
          <UIButton
            v-radar="{ name: 'Select files button', desc: 'Click to choose the files to upload' }"
            type="secondary"
            size="small"
            :loading="handleSelectFiles.isLoading.value"
            @click="handleSelectFiles.fn"
          >
            {{
              files.length === 0
                ? $t({ en: 'Select files...', zh: '选择文件...' })
                : $t({ en: 'Select again...', zh: '重新选择...' })
            }}
          </UIButton>
        </div>
        <!-- The chosen files, one name per row, scrollable when long. -->
        <ul v-if="files.length > 0" class="m-0 max-h-32 list-none overflow-y-auto p-0">
          <li v-for="file in files" :key="file.name" class="truncate" :title="file.name">{{ file.name }}</li>
        </ul>
        <!-- Placeholder while nothing has been chosen yet. -->
        <p v-else class="m-0 text-grey-700">{{ $t({ en: 'No files selected yet', zh: '还没有选择文件' }) }}</p>
      </div>
      <!-- Target folder section: one-click known folders plus a free-text input for any other path. -->
      <div class="flex flex-col gap-1">
        <span class="text-grey-700">{{ $t({ en: 'Target folder', zh: '目标目录' }) }}</span>
        <!-- Folders the tree already has; any other path can be typed, its folders appear with the files. -->
        <div class="flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded border border-line p-1">
          <!-- One button per accepted folder; the one matching the normalized input is highlighted. -->
          <button
            v-for="candidate in knownDirs"
            :key="candidate"
            v-radar="{ name: `Target folder ${dirLabel(candidate)}`, desc: 'Click to upload into this folder' }"
            class="w-full cursor-pointer rounded border-none bg-transparent px-2 py-1 text-left hover:bg-grey-400"
            :class="candidate === dir && 'bg-primary-100 text-primary-main hover:bg-primary-100'"
            @click="dirInput = candidate"
          >
            <code>{{ dirLabel(candidate) }}</code>
          </button>
        </div>
        <!-- Free-text target; `dir` normalizes it on the fly, so stray slashes are forgiven. -->
        <UITextInput
          v-radar="{
            name: 'Target folder input',
            desc: 'Input for the folder to upload into; new folders are created as needed'
          }"
          :value="dirInput"
          placeholder="docs/handouts"
          @update:value="(v) => (dirInput = v)"
        />
      </div>
      <!-- Message area: exactly one of four states, in priority order. -->
      <!-- 1. Refused: the first policy error, in red; the Upload button is disabled meanwhile. -->
      <p v-if="error != null" class="m-0 text-red-main">{{ $t(error) }}</p>
      <!-- 2. Package target (`assets/<kind>`): each file becomes a package of that kind. -->
      <p v-else-if="packageKind != null" class="m-0 text-grey-700">
        {{
          $t({
            en: `Each file becomes a ${packageKind} resource package named after the file.`,
            zh: `每个文件将成为一个以文件名命名的 ${packageKind} 资源包。`
          })
        }}
      </p>
      <!-- 3. Plain-record target with collisions: lists the extra files that will be replaced. -->
      <p v-else-if="conflicts.length > 0" class="m-0 text-yellow-main">
        {{ $t({ en: 'Existing files will be replaced:', zh: '将替换已有文件：' }) }}
        <code>{{ conflicts.join(', ') }}</code>
      </p>
      <!-- 4. Plain-record target without collisions: reminds that such files are kept but unused. -->
      <p v-else class="m-0 text-grey-700">
        {{
          $t({
            en: 'Files outside assets are kept with the course but not used by it.',
            zh: 'assets 之外的文件随课程保存，但课程不会使用它们。'
          })
        }}
      </p>
      <!-- Actions: Cancel rejects the modal promise; Upload resolves it with the normalized dir and the files. -->
      <div class="flex justify-end gap-3">
        <UIButton type="neutral" @click="emit('cancelled')">{{ $t({ en: 'Cancel', zh: '取消' }) }}</UIButton>
        <!-- Disabled until there are files and no policy error. -->
        <UIButton
          v-radar="{ name: 'Confirm upload button', desc: 'Click to upload the files into the chosen folder' }"
          type="primary"
          :disabled="error != null || files.length === 0"
          @click="emit('resolved', { dir, files })"
        >
          {{ $t({ en: 'Upload', zh: '上传' }) }}
        </UIButton>
      </div>
    </div>
  </UIFormModal>
</template>
