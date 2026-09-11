<script setup lang="ts">
/**
 * Purpose: The left-hand explorer of the Course Editor. It renders the course itself as the root row (with the
 * "Upload..." button next to it) followed by the tree of course nodes, highlights the open node and marks nodes
 * with unsaved changes. It holds no state of its own: what is open comes from `activePath`, what is dirty from
 * `changedPaths`, and every click is reported to the parent, which navigates.
 *
 * Props:
 * - `project`: the Tutorial project, read only for its `title` (the root row label).
 * - `tree`: the top-level `CourseNode[]` built by `course-tree.ts#buildCourseTree`.
 * - `activePath`: path of the open node; the empty path is the course itself (root row highlighted).
 * - `changedPaths`: paths whose record differs from the saved baseline (`course-tree.ts#getChangedPaths`).
 *
 * Emits:
 * - `select(path)`: the author clicked a row; `path` is the node's in-Course-Editor path ('' for the root).
 *   Listened by `components/course-editor/CourseEditor.vue#template` (`@select="openPath"`).
 * - `upload()`: the author clicked "Upload..."; the target folder is chosen in the upload flow. Listened by
 *   `components/course-editor/CourseEditor.vue#template` (`@upload="handleUpload.fn()"`).
 *
 * Used by: `components/course-editor/CourseEditor.vue#template` (inside the explorer `UICard`).
 *
 * Uses: CourseExplorerNode (one per top-level node, recursive below that) and its exported row classes, UIButton,
 * `course-tree.ts#isNodeDirty`.
 */
import { computed } from 'vue'
import type { TutorialProject } from '@/models/tutorial/project'
import { UIButton } from '@/components/ui'
import { isNodeDirty, type CourseNode } from './course-tree'
import CourseExplorerNode, {
  explorerActiveNodeClass,
  explorerDotClass,
  explorerNodeClass
} from './CourseExplorerNode.vue'

const props = defineProps<{
  /** The Tutorial project; only its `title` is read, for the root row. */
  project: TutorialProject
  /** Top-level nodes of the course tree, already sorted (see `course-tree.ts#buildCourseTree`). */
  tree: CourseNode[]
  /** Path of the open node; the empty path is the course itself. */
  activePath: string
  /** Paths whose record differs from the saved baseline; drives the unsaved dots. */
  changedPaths: Set<string>
}>()

const emit = defineEmits<{
  /** A row was clicked; carries the node's path ('' for the course root). */
  select: [path: string]
  /** Upload files; the target folder is chosen in the upload flow. */
  upload: []
}>()

/**
 * Whether the course root has unsaved changes, i.e. whether the config record (`index.json`) is among
 * `changedPaths` (see `course-tree.ts#isNodeDirty` for the `{ type: 'root' }` case).
 * @returns `true` when the course settings are unsaved.
 * Read by: `CourseExplorer.vue#template` (the dot on the root row).
 * Called by: Vue (computed; re-evaluated when `props.changedPaths` changes)
 */
const rootDirty = computed(() => isNodeDirty({ type: 'root' }, props.changedPaths))
</script>

<template>
  <!-- Scrollable column: the root row first, then one `CourseExplorerNode` per top-level node. -->
  <nav
    v-radar="{
      name: 'Course explorer',
      desc: 'Tree of the course records: the course itself, its program, videos, other files and the embedded project'
    }"
    class="flex h-full flex-col gap-0.5 overflow-y-auto p-2"
  >
    <!-- Root row: the course button (fills the row) and the "Upload..." button beside it. -->
    <div class="flex items-center gap-1">
      <!-- The course itself is the root: its settings live in `index.json`, its title and thumbnail in course management. -->
      <!-- Highlighted when `activePath` is empty; clicking emits `select('')`; the dot shows `rootDirty`. -->
      <button
        v-radar="{ name: 'Course root node', desc: 'Click to edit the course settings' }"
        :class="[explorerNodeClass, 'min-w-0 flex-1 pl-2 font-semibold', activePath === '' && explorerActiveNodeClass]"
        :title="project.title"
        @click="emit('select', '')"
      >
        <span class="truncate">{{ project.title }}</span>
        <span class="flex-none text-xs font-normal text-grey-700">{{ $t({ en: 'Course', zh: '课程' }) }}</span>
        <span v-if="rootDirty" :class="explorerDotClass">•</span>
      </button>
      <!-- Upload entry point: emits `upload`; the parent opens the modal with a proposed target folder. -->
      <UIButton
        v-radar="{ name: 'Upload files button', desc: 'Click to upload files into the course' }"
        class="flex-none"
        type="secondary"
        size="small"
        @click="emit('upload')"
      >
        {{ $t({ en: 'Upload...', zh: '上传...' }) }}
      </UIButton>
    </div>
    <!-- Tree rows: each top-level node at depth 1; nested selections are re-emitted as `select` unchanged. -->
    <CourseExplorerNode
      v-for="node in tree"
      :key="node.path"
      :node="node"
      :depth="1"
      :active-path="activePath"
      :changed-paths="changedPaths"
      @select="emit('select', $event)"
    />
  </nav>
</template>
