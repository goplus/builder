<script setup lang="ts">
/**
 * Document shown when a folder node of the course tree is open. It lists the folder's children as buttons that
 * open them, offers an "Upload..." button when the upload policy allows files to land here, and explains what
 * files put into `assets/<kind>` folders become (videos the course program can address by name; other kinds are
 * packaged the same way but cannot be addressed yet).
 *
 * Props:
 * - `project`: the loaded Tutorial project, consulted by `validateUploadDir` (project root, `assets` rules).
 * - `node`: the open `FolderNode`; its `path` names the folder and its `children` are already sorted.
 *
 * Emits:
 * - `open`: payload is a child's path; `CourseEditor.vue` navigates to it (`@open="openPath"`).
 * - `upload`: payload is this folder's path as the proposed target; `CourseEditor.vue` runs the upload flow with
 *   it (`@upload="(dir) => handleUpload.fn(dir)"`).
 *
 * Used by:
 * - components/course-editor/CourseEditor.vue#template (the `doc.node.type === 'folder'` branch, keyed by path)
 *
 * Uses:
 * - components/ui UIButton, UIEmpty
 * - models/tutorial/resource (getResourceKindDir, videosKind)
 * - components/course-editor/upload.ts (getUploadResourceKind, validateUploadDir)
 */
import { computed } from 'vue'
import { filename } from '@/utils/path'
import type { TutorialProject } from '@/models/tutorial/project'
import { getResourceKindDir, videosKind } from '@/models/tutorial/resource'
import { UIButton, UIEmpty } from '@/components/ui'
import type { CourseNode, FolderNode } from './course-tree'
import { getUploadResourceKind, validateUploadDir } from './upload'

const props = defineProps<{
  project: TutorialProject
  node: FolderNode
}>()

const emit = defineEmits<{
  open: [path: string]
  /** Upload files into this folder. */
  upload: [dir: string]
}>()

/**
 * Whether this is the `assets/videos` folder, the one kind the course program can address today. It gets a
 * friendlier title, button label and explanation than other kind folders.
 *
 * @returns `true` for `assets/videos`.
 *
 * Called by:
 * - components/course-editor/CourseFolderDoc.vue#template (title, upload button label, explanation)
 */
const isVideosFolder = computed(() => props.node.path === getResourceKindDir(videosKind))
/**
 * The resource kind this folder packages uploads as, when it is `assets/<kind>`; null for any other folder.
 *
 * @returns The kind string, or `null`.
 *
 * Called by:
 * - components/course-editor/CourseFolderDoc.vue#template (the generic kind explanation)
 */
const resourceKind = computed(() => getUploadResourceKind(props.node.path))
/**
 * Whether the upload policy accepts files in this folder; hides the upload button otherwise (the project root,
 * `assets` itself and package directories refuse).
 *
 * @returns `true` when `validateUploadDir` has no complaint.
 *
 * Called by:
 * - components/course-editor/CourseFolderDoc.vue#template (`v-if` on the upload button)
 */
const canUpload = computed(() => validateUploadDir(props.project, props.node.path) == null)

/**
 * Display name of a child in the list. The project node has no `name`, so its root directory name is used.
 *
 * @param child - Any child node of this folder.
 * @returns The child's `name`, or the last segment of the project's root path.
 *
 * Called by:
 * - components/course-editor/CourseFolderDoc.vue#template (each child button)
 */
function childLabel(child: CourseNode) {
  return child.type === 'project' ? filename(child.path) : child.name
}
</script>

<template>
  <!-- The whole document scrolls vertically. -->
  <div class="flex h-full flex-col gap-3 overflow-y-auto p-4">
    <!-- Header: the folder path (or "Videos" for assets/videos) and, when allowed, the upload button. -->
    <div class="flex items-center justify-between gap-3">
      <h2 class="m-0 truncate text-base font-semibold" :title="node.path">
        {{ isVideosFolder ? $t({ en: 'Videos', zh: '视频' }) : node.path }}
      </h2>
      <!-- Shown only when the policy accepts uploads here; the label is specialized for the videos folder. -->
      <UIButton
        v-if="canUpload"
        v-radar="{ name: 'Upload into folder button', desc: 'Click to upload files into this folder' }"
        type="secondary"
        size="small"
        @click="emit('upload', node.path)"
      >
        {{ isVideosFolder ? $t({ en: 'Add video...', zh: '添加视频...' }) : $t({ en: 'Upload...', zh: '上传...' }) }}
      </UIButton>
    </div>
    <!-- Explanation for the videos folder: files become videos the course program addresses by name. -->
    <p v-if="isVideosFolder" class="m-0 text-sm text-grey-700">
      {{
        $t({
          en: 'Every file added here becomes a video the course program refers to by name, e.g.',
          zh: '放到这里的每个文件都成为一个视频，课程程序按名字引用它，例如'
        })
      }}
      <code>showVideo "step-to"</code>
    </p>
    <!-- Explanation for any other assets/<kind> folder: files are packaged, but the program cannot use them yet. -->
    <p v-else-if="resourceKind != null" class="m-0 text-sm text-grey-700">
      {{
        $t({
          en: `Every file added here becomes a ${resourceKind} resource package. The course program cannot address this kind yet.`,
          zh: `放到这里的每个文件都成为一个 ${resourceKind} 资源包。课程程序目前还不能引用这种资源。`
        })
      }}
    </p>
    <!-- Empty state when the folder has no children (e.g. assets/videos before the first video is added). -->
    <UIEmpty v-if="node.children.length === 0" size="small">
      {{ $t({ en: 'Empty folder', zh: '空文件夹' }) }}
    </UIEmpty>
    <!-- Otherwise one button per child (already sorted by the tree), showing its name and node type. -->
    <ul v-else class="m-0 flex list-none flex-col gap-1 p-0">
      <li v-for="child in node.children" :key="child.path">
        <button
          v-radar="{ name: `Open ${child.path}`, desc: 'Click to open this item' }"
          class="flex w-full cursor-pointer items-center gap-2 rounded border border-line bg-transparent px-3 py-2 text-left text-sm hover:bg-grey-400"
          @click="emit('open', child.path)"
        >
          <span class="truncate">{{ childLabel(child) }}</span>
          <span class="flex-none text-xs text-grey-700">{{ child.type }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
