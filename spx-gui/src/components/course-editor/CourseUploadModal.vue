<script lang="ts">
import type { CourseNode } from './course-tree'

/** Directories of the tree that accept uploads, in tree order; the course root comes first. */
function collectUploadDirs(nodes: CourseNode[], accepts: (dir: string) => boolean, into: string[] = []) {
  for (const node of nodes) {
    if (node.type !== 'folder') continue
    if (accepts(node.path)) into.push(node.path)
    collectUploadDirs(node.children, accepts, into)
  }
  return into
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { selectFilesWithUploadLimit } from '@/models/common/cloud'
import type { TutorialProject } from '@/models/tutorial/project'
import { UIButton, UIFormModal, UITextInput } from '@/components/ui'
import { getUploadConflicts, isResourceKindDir, normalizeDir, validateUploadDir, validateUploadPath } from './upload'

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

const files = shallowRef<globalThis.File[]>([])

const handleSelectFiles = useMessageHandle(
  async () => {
    files.value = await selectFilesWithUploadLimit({})
  },
  { en: 'Failed to select files', zh: '选择文件失败' }
)

const dirInput = ref(props.initialDir)
const dir = computed(() => normalizeDir(dirInput.value))

const knownDirs = computed(() => [
  '',
  ...collectUploadDirs(props.tree, (candidate) => validateUploadDir(props.project, candidate) == null)
])

// The first problem found, if any; the directory rule comes before per-file rules.
const error = computed(() => {
  const dirError = validateUploadDir(props.project, dir.value)
  if (dirError != null) return dirError
  for (const file of files.value) {
    const pathError = validateUploadPath(props.project, dir.value, file.name)
    if (pathError != null) return pathError
  }
  return null
})

const conflicts = computed(() =>
  error.value == null
    ? getUploadConflicts(
        props.project,
        dir.value,
        files.value.map((file) => file.name)
      )
    : []
)

const becomesPackages = computed(() => error.value == null && isResourceKindDir(dir.value))

function dirLabel(candidate: string) {
  return candidate === '' ? '/' : candidate
}
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Upload files modal', desc: 'Choose where uploaded files go in the course' }"
    :title="$t({ en: 'Upload files', zh: '上传文件' })"
    :visible="visible"
    style="width: 640px"
    @update:visible="emit('cancelled')"
  >
    <div class="flex flex-col gap-4 text-sm">
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-3">
          <span class="text-grey-700">{{ $t({ en: 'Files', zh: '文件' }) }}</span>
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
        <ul v-if="files.length > 0" class="m-0 max-h-32 list-none overflow-y-auto p-0">
          <li v-for="file in files" :key="file.name" class="truncate" :title="file.name">{{ file.name }}</li>
        </ul>
        <p v-else class="m-0 text-grey-700">{{ $t({ en: 'No files selected yet', zh: '还没有选择文件' }) }}</p>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-grey-700">{{ $t({ en: 'Target folder', zh: '目标目录' }) }}</span>
        <!-- Folders the tree already has; any other path can be typed, its folders appear with the files. -->
        <div class="flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded border border-line p-1">
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
      <p v-if="error != null" class="m-0 text-red-main">{{ $t(error) }}</p>
      <p v-else-if="becomesPackages" class="m-0 text-grey-700">
        {{
          $t({
            en: 'Each file becomes a video resource named after the file.',
            zh: '每个文件将成为一个以文件名命名的视频资源。'
          })
        }}
      </p>
      <p v-else-if="conflicts.length > 0" class="m-0 text-yellow-main">
        {{ $t({ en: 'Existing files will be replaced:', zh: '将替换已有文件：' }) }}
        <code>{{ conflicts.join(', ') }}</code>
      </p>
      <p v-else class="m-0 text-grey-700">
        {{
          $t({
            en: 'Files outside assets are kept with the course but not used by it.',
            zh: 'assets 之外的文件随课程保存，但课程不会使用它们。'
          })
        }}
      </p>
      <div class="flex justify-end gap-3">
        <UIButton type="neutral" @click="emit('cancelled')">{{ $t({ en: 'Cancel', zh: '取消' }) }}</UIButton>
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
