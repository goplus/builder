<script setup lang="ts">
/**
 * Modal for adding files to the course, opened programmatically with `useModal(CourseUploadModal)`. The author
 * says what they are uploading (a video, a picture, or something else) and picks the files; the type decides
 * where the records go, so no path is ever typed. `./upload.ts` holds that mapping and the rules that can still
 * refuse a file. The modal does not touch the project: it resolves with the choice and `CourseEditor.vue`
 * performs the upload.
 *
 * Props:
 * - `visible`: whether the modal is shown; set by `UIModalProvider` (true after mount, false while closing).
 * - `project`: the loaded Tutorial project, read by the validation helpers (claimed paths, existing records).
 * - `initialType`: the type to start on, proposed from what the author has open.
 *
 * Emits:
 * - `cancelled`: the author closed the modal (close button, mask or Cancel). `UIModalProvider` rejects the
 *   `openUploadModal(...)` promise with `Cancelled`, which `useMessageHandle` in `CourseEditor.vue` swallows.
 * - `resolved`: payload `{ type, files }`, the chosen upload type and the chosen native files.
 *   `UIModalProvider` resolves the promise awaited in `CourseEditor.vue#handleUpload`.
 *
 * Used by:
 * - components/course-editor/CourseEditor.vue#handleUpload (via `useModal(CourseUploadModal)`)
 *
 * Uses:
 * - components/ui UIFormModal, UIButton
 * - models/common/cloud#selectFilesWithUploadLimit (native file picker plus the upload size limit check)
 * - components/course-editor/upload.ts (uploadTypes, getUploadTypeLabel, getUploadTypeHint, getUploadDir,
 *   validateUpload, getUploadConflicts)
 */
import { computed, ref, shallowRef } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { selectFilesWithUploadLimit } from '@/models/common/cloud'
import type { TutorialProject } from '@/models/tutorial/project'
import { UIButton, UIFormModal } from '@/components/ui'
import {
  getUploadConflicts,
  getUploadDir,
  getUploadTypeHint,
  getUploadTypeLabel,
  uploadTypes,
  validateUpload,
  type UploadType
} from './upload'

const props = defineProps<{
  visible: boolean
  project: TutorialProject
  /** Upload type proposed from the open node. */
  initialType: UploadType
}>()

const emit = defineEmits<{
  cancelled: []
  /** Resolves with the chosen upload type and the files to upload. */
  resolved: [result: { type: UploadType; files: globalThis.File[] }]
}>()

/** What the author says they are uploading; starts from the proposed type. */
const type = ref<UploadType>(props.initialType)

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

/**
 * The first reason the current type/files combination is refused, or null. Recomputed whenever the type or the
 * file list changes; disables the Upload button and is shown in red.
 *
 * @returns A `LocaleMessage` from `validateUpload`, or `null` when everything passes.
 *
 * Called by:
 * - components/course-editor/CourseUploadModal.vue#conflicts
 * - components/course-editor/CourseUploadModal.vue#template (the message area; the Upload button's `disabled`)
 */
const error = computed(() =>
  validateUpload(
    props.project,
    type.value,
    files.value.map((file) => file.name)
  )
)

/**
 * Existing records the upload would replace, for the yellow warning. Empty while there is an error (the warning
 * would be misleading) and for the resource types (each package gets a fresh name).
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
        getUploadDir(type.value),
        files.value.map((file) => file.name)
      )
    : []
)
</script>

<template>
  <!--
    The modal shell. `visible` comes from UIModalProvider; closing it by any means (mask click, close button)
    emits `cancelled`, which rejects the promise awaited in CourseEditor.vue#handleUpload.
  -->
  <UIFormModal
    :radar="{ name: 'upload-files-modal', desc: 'Choose what kind of thing to add to the course' }"
    :title="$t({ en: 'Add to the course', zh: '添加内容' })"
    :visible="visible"
    style="width: 560px"
    @update:visible="emit('cancelled')"
  >
    <div class="flex flex-col gap-4 text-sm">
      <!-- Type section: the whole choice the author makes; the type decides where the files go. -->
      <div class="flex flex-col gap-1">
        <span class="text-grey-700">{{ $t({ en: 'What are you adding?', zh: '你要添加什么？' }) }}</span>
        <div class="flex gap-2">
          <!-- One button per type; the chosen one is highlighted. -->
          <button
            v-for="candidate in uploadTypes"
            :key="candidate"
            v-radar="{
              name: 'upload-type-option',
              desc: 'Click to choose what kind of thing to add',
              attrs: { type: candidate }
            }"
            class="flex-1 cursor-pointer rounded border border-line bg-transparent px-3 py-2 hover:bg-grey-400"
            :class="candidate === type && 'border-primary-main bg-primary-100 text-primary-main hover:bg-primary-100'"
            @click="type = candidate"
          >
            {{ $t(getUploadTypeLabel(candidate)) }}
          </button>
        </div>
        <!-- What choosing this type will do. -->
        <p class="m-0 text-grey-700">{{ $t(getUploadTypeHint(type)) }}</p>
      </div>
      <!-- Files section: the picker button and the list of chosen file names. -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-3">
          <span class="text-grey-700">{{ $t({ en: 'Files', zh: '文件' }) }}</span>
          <!-- Opens the native picker; the label switches once files are chosen; busy while the picker is open. -->
          <UIButton
            v-radar="{ name: 'select-files-button', desc: 'Click to choose the files to add' }"
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
      <!-- Message area: a refusal, or the records this upload would replace. -->
      <p v-if="error != null" class="m-0 text-red-main">{{ $t(error) }}</p>
      <p v-else-if="conflicts.length > 0" class="m-0 text-yellow-main">
        {{ $t({ en: 'These files will be replaced:', zh: '将替换这些文件：' }) }}
        <code>{{ conflicts.join(', ') }}</code>
      </p>
      <!-- Actions: Cancel rejects the modal promise; Upload resolves it with the type and the files. -->
      <div class="flex justify-end gap-3">
        <UIButton type="neutral" @click="emit('cancelled')">{{ $t({ en: 'Cancel', zh: '取消' }) }}</UIButton>
        <!-- Disabled until there are files and no policy error. -->
        <UIButton
          v-radar="{ name: 'confirm-button', desc: 'Click to add the chosen files to the course' }"
          type="primary"
          :disabled="error != null || files.length === 0"
          @click="emit('resolved', { type, files })"
        >
          {{ $t({ en: 'Add', zh: '添加' }) }}
        </UIButton>
      </div>
    </div>
  </UIFormModal>
</template>
