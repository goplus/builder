<script lang="ts">
/**
 * Base classes shared by every explorer row (the root row in `CourseExplorer` and each tree node here): a
 * full-width, flat, left-aligned button with a hover highlight.
 * Used by: `components/course-editor/CourseExplorer.vue#template`,
 * `components/course-editor/CourseExplorerNode.vue#template`.
 */
export const explorerNodeClass =
  'flex w-full items-center gap-1 rounded py-1 pr-2 text-left text-sm border-none bg-transparent cursor-pointer hover:bg-grey-400'
/**
 * Classes added to the row of the open node (primary tint, hover kept identical so it does not flicker).
 * Used by: `components/course-editor/CourseExplorer.vue#template` (root row when `activePath === ''`),
 * `components/course-editor/CourseExplorerNode.vue#template` (when `active`).
 */
export const explorerActiveNodeClass = 'bg-primary-100 text-primary-main hover:bg-primary-100'
/** A dot marks a node with changes not saved yet. */
/**
 * Classes of that dot.
 * Used by: `components/course-editor/CourseExplorer.vue#template` (when `rootDirty`),
 * `components/course-editor/CourseExplorerNode.vue#template` (when `dirty`).
 */
export const explorerDotClass = 'ml-1 text-primary-main'
</script>

<script setup lang="ts">
/**
 * Purpose: One row of the course explorer tree, rendered recursively for folders. It shows the node's label, a
 * type hint (project type, resource kind, package count, "Course program"), an "Unused" tag for records the
 * course format gives no role to, and the unsaved dot; folders can be collapsed locally. Clicking a row reports
 * the node's path upwards; the parent chain forwards it unchanged to `CourseEditor`, which navigates.
 *
 * Props:
 * - `node`: the `CourseNode` this row stands for (project, resource, file or folder).
 * - `depth`: nesting level starting at 1 for top-level nodes; drives the left indentation.
 * - `activePath`: path of the open node (from the route); used to highlight this row.
 * - `changedPaths`: paths with unsaved records; used to show the dot.
 *
 * Emits:
 * - `select(path)`: this row (or a descendant row) was clicked; `path` is that node's in-Course-Editor path.
 *   Listened by `components/course-editor/CourseExplorer.vue#template` and, for nested rows, by
 *   `components/course-editor/CourseExplorerNode.vue#template` (which re-emits it).
 *
 * Used by: `components/course-editor/CourseExplorer.vue#template` (top-level nodes),
 * `components/course-editor/CourseExplorerNode.vue#template` (children of an expanded folder).
 *
 * Uses: UITag, `course-tree.ts#isNodeDirty`, `route.ts#isPathWithin`, `upload.ts#getUploadResourceKind`,
 * `models/tutorial/resource.ts#getResourceKindDir` / `videosKind`, `utils/path#filename`.
 */
import { computed, ref } from 'vue'
import type { LocaleMessage } from '@/utils/i18n'
import { filename } from '@/utils/path'
import { getResourceKindDir, videosKind } from '@/models/tutorial/resource'
import { getUploadResourceKind } from './upload'
import { UITag } from '@/components/ui'
import { isNodeDirty, type CourseNode } from './course-tree'
import { isPathWithin } from './route'

const props = defineProps<{
  /** The node this row renders. */
  node: CourseNode
  /** Nesting level (1 for top-level nodes); each level indents the row by 12px. */
  depth: number
  /** Path of the open node. */
  activePath: string
  /** Paths whose record differs from the saved baseline. */
  changedPaths: Set<string>
}>()

const emit = defineEmits<{
  /** This row or a descendant row was clicked; carries that node's path. */
  select: [path: string]
}>()

/**
 * Whether a folder row shows its children. Local UI state only (not in the route); starts expanded.
 * Written by: `CourseExplorerNode.vue#template` (the toggle glyph's `@click.stop`).
 * Read by: `CourseExplorerNode.vue#template` (the glyph and the children block).
 */
const expanded = ref(true)

/**
 * Whether this node has unsaved records: any changed path equal to or under the node's path (folders and
 * packages are dirty when anything inside them is).
 * @returns `true` when the node should show the unsaved dot.
 * Read by: `CourseExplorerNode.vue#template`.
 * Called by: Vue (computed; re-evaluated when `props.node` or `props.changedPaths` changes)
 */
const dirty = computed(() => isNodeDirty(props.node, props.changedPaths))

// The project node stands for everything under its root, including the Project Editor's own in-editor path.
/**
 * Whether this row is the open one. Exact path match for every node except the project node, which is active
 * for any path at or under its root (the tail is the Project Editor's in-editor path).
 * @returns `true` when the row should be highlighted.
 * Read by: `CourseExplorerNode.vue#template` (`explorerActiveNodeClass`).
 * Called by: Vue (computed; re-evaluated when `props.node` or `props.activePath` changes)
 */
const active = computed(() => {
  const node = props.node
  return node.type === 'project' ? isPathWithin(props.activePath, node.path) : props.activePath === node.path
})

/**
 * The row label: the last path segment for the project node (it has no `name`), the node's name otherwise.
 * @returns The text shown in the row.
 * Read by: `CourseExplorerNode.vue#template`.
 * Called by: Vue (computed; re-evaluated when `props.node` changes)
 */
const label = computed(() => (props.node.type === 'project' ? filename(props.node.path) : props.node.name))

/**
 * A short, localized type hint shown after the label, or null when the node needs none (plain folders, unused
 * files). Resource kind folders (`assets/<kind>`) show the kind and how many packages they hold.
 * @returns A `LocaleMessage` for `$t`, or null.
 * Read by: `CourseExplorerNode.vue#template`.
 * Called by: Vue (computed; re-evaluated when `props.node` or its children change)
 */
const hint = computed<LocaleMessage | null>(() => {
  const node = props.node
  switch (node.type) {
    // The embedded learner project, labelled with its type from `index.json` (only `spx` today).
    case 'project':
      return { en: `Project (${node.projectType})`, zh: `工程（${node.projectType}）` }
    // A resource package: "Video" for the kind the course program can address, the raw kind name otherwise.
    case 'resource':
      return node.kind === videosKind ? { en: 'Video', zh: '视频' } : { en: node.kind, zh: node.kind }
    case 'folder': {
      // `assets/<kind>` folders hold packages of that kind.
      const kind = getUploadResourceKind(node.path)
      // Any other folder gets no hint.
      if (kind == null) return null
      // Count only the packages, not stray files that may sit next to them.
      const count = node.children.filter((child) => child.type === 'resource').length
      if (node.path === getResourceKindDir(videosKind)) return { en: `Videos (${count})`, zh: `视频（${count}）` }
      return { en: `${kind} (${count})`, zh: `${kind}（${count}）` }
    }
    // The only known file is the course program; unused records show the "Unused" tag instead of a hint.
    case 'file':
      return node.known ? { en: 'Course program', zh: '课程程序' } : null
    default:
      return null
  }
})
</script>

<template>
  <!-- One node: its row button, then (for an expanded folder) the child rows one level deeper. -->
  <div>
    <!-- Row button: indented by `depth`, highlighted when `active`; clicking emits `select(node.path)`. -->
    <button
      v-radar="{ name: `Explorer node ${node.path}`, desc: `Click to open ${node.type} ${node.path}` }"
      :class="[explorerNodeClass, active && explorerActiveNodeClass]"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      :title="node.path"
      @click="emit('select', node.path)"
    >
      <!-- Folder toggle glyph: flips `expanded` without opening the folder (`@click.stop`). -->
      <span
        v-if="node.type === 'folder'"
        v-radar="{ name: `Toggle folder ${node.path}`, desc: 'Click to expand or collapse this folder' }"
        class="w-4 flex-none text-xs text-grey-700"
        @click.stop="expanded = !expanded"
        >{{ expanded ? '▾' : '▸' }}</span
      >
      <!-- Non-folders get an empty spacer of the same width so labels line up. -->
      <span v-else class="w-4 flex-none"></span>
      <span class="truncate">{{ label }}</span>
      <!-- Type hint (project type, resource kind, package count, "Course program"), when the node has one. -->
      <span v-if="hint != null" class="flex-none text-xs text-grey-700">{{ $t(hint) }}</span>
      <!-- "Unused" tag: a record the course format gives no role to (kept on save, never read by the course). -->
      <UITag
        v-if="node.type === 'file' && !node.known"
        class="flex-none"
        color="warning"
        :title="$t({ en: 'The course does not use this file', zh: '课程不会使用此文件' })"
        >{{ $t({ en: 'Unused', zh: '未使用' }) }}</UITag
      >
      <!-- Unsaved dot. -->
      <span v-if="dirty" :class="explorerDotClass">•</span>
    </button>
    <!-- Children: only for folders, only while expanded; each child is a nested row that re-emits `select`. -->
    <template v-if="node.type === 'folder' && expanded">
      <CourseExplorerNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :active-path="activePath"
        :changed-paths="changedPaths"
        @select="emit('select', $event)"
      />
    </template>
  </div>
</template>
