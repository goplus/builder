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
 * Purpose: One row of the course explorer tree, rendered recursively for the rows that hold others. It shows what
 * the node is (`getNodeLabel`: the course program, a resource group, a package's name, the project, or the
 * heading collecting unused records), a count or the project type as a hint, and the unsaved dot. Clicking a row
 * reports the node's path upwards; the parent chain forwards it unchanged to `CourseEditor`, which navigates. The
 * heading of unused records stands for no record, so clicking it only folds it away.
 *
 * Props:
 * - `node`: the `CourseNode` this row stands for (project, resource, file, resource group or unused heading).
 * - `depth`: nesting level starting at 1 for top-level nodes; drives the left indentation.
 * - `activePath`: path of the open node (from the route); used to highlight this row.
 * - `changedPaths`: paths with unsaved records; used to show the dot.
 * - `collapsedKeys`: keys of the rows folded away, which is where this row learns whether it is folded.
 *
 * Emits:
 * - `select(path)`: this row (or a descendant row) was clicked; `path` is that node's in-Course-Editor path.
 *   Listened by `components/course-editor/CourseExplorer.vue#template` and, for nested rows, by
 *   `components/course-editor/CourseExplorerNode.vue#template` (which re-emits it).
 * - `toggle(key)`: this row (or a descendant row) is to be folded or unfolded; `key` is that node's key.
 *   Listened the same way as `select`; `CourseExplorer` owns the folded rows and remembers them.
 *
 * Used by: `components/course-editor/CourseExplorer.vue#template` (top-level nodes),
 * `components/course-editor/CourseExplorerNode.vue#template` (children of an expanded row).
 *
 * Uses: `course-tree.ts#getNodeLabel` / `#getNodeKey` / `#isNodeDirty`, `route.ts#isPathWithin`.
 */
import { computed } from 'vue'
import type { LocaleMessage } from '@/utils/i18n'
import { getNodeKey, getNodeLabel, isNodeDirty, type CourseNode } from './course-tree'
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
  /** Keys of the rows folded away (see `explorer-collapse.ts`). */
  collapsedKeys: Set<string>
}>()

const emit = defineEmits<{
  /** This row or a descendant row was clicked; carries that node's path. */
  select: [path: string]
  /** This row or a descendant row is to be folded or unfolded; carries that node's key. */
  toggle: [key: string]
}>()

/**
 * Whether a row that holds others shows them. Rows start expanded and stay as the author leaves them for the
 * rest of the tab (`explorer-collapse.ts`); it is not part of the route.
 * @returns `true` unless this row's key is among the folded ones.
 * Read by: `CourseExplorerNode.vue#template` (the glyph and the children block).
 * Called by: Vue (computed; re-evaluated when `props.node` or `props.collapsedKeys` changes)
 */
const expanded = computed(() => !props.collapsedKeys.has(getNodeKey(props.node)))

/**
 * Whether this row holds other rows: a resource group or the heading of unused records.
 * @returns `true` when the row has children of its own.
 * Read by: `CourseExplorerNode.vue#template`.
 * Called by: Vue (computed; re-evaluated when `props.node` changes)
 */
const branch = computed(() => props.node.type === 'folder' || props.node.type === 'group')

/**
 * The rows nested under this one; empty for every node that holds none.
 * @returns The node's children, or `[]`.
 * Read by: `CourseExplorerNode.vue#template`.
 * Called by: Vue (computed; re-evaluated when `props.node` changes)
 */
const children = computed<CourseNode[]>(() =>
  props.node.type === 'folder' || props.node.type === 'group' ? props.node.children : []
)

/**
 * Whether this node has unsaved records: any changed path equal to or under the node's path (a group, a resource
 * group or the project is dirty when anything inside it is).
 * @returns `true` when the row should show the unsaved dot.
 * Read by: `CourseExplorerNode.vue#template`.
 * Called by: Vue (computed; re-evaluated when `props.node` or `props.changedPaths` changes)
 */
const dirty = computed(() => isNodeDirty(props.node, props.changedPaths))

// The project node stands for everything under its root, including the Project Editor's own in-editor path.
/**
 * Whether this row is the open one. Exact path match for every node except the project node, which is active for
 * any path at or under its root (the tail is the Project Editor's in-editor path). The unused heading has no path
 * and is never active.
 * @returns `true` when the row should be highlighted.
 * Read by: `CourseExplorerNode.vue#template` (`explorerActiveNodeClass`).
 * Called by: Vue (computed; re-evaluated when `props.node` or `props.activePath` changes)
 */
const active = computed(() => {
  const node = props.node
  if (node.type === 'group') return false
  return node.type === 'project' ? isPathWithin(props.activePath, node.path) : props.activePath === node.path
})

/**
 * What this row is called: what the node is, not where its records sit (`getNodeLabel`).
 * @returns A `LocaleMessage` for `$t`.
 * Read by: `CourseExplorerNode.vue#template`, `radarNodeMeta`.
 * Called by: Vue (computed; re-evaluated when `props.node` changes)
 */
const label = computed(() => getNodeLabel(props.node))

/**
 * A short hint after the label, or null when the label says everything: the project's type, and how many things a
 * resource group or the unused heading holds.
 * @returns A `LocaleMessage` for `$t`, or null.
 * Read by: `CourseExplorerNode.vue#template`.
 * Called by: Vue (computed; re-evaluated when `props.node` or its children change)
 */
const hint = computed<LocaleMessage | null>(() => {
  const node = props.node
  switch (node.type) {
    // The embedded learner project, hinted with its type from `index.json` (only `spx` today).
    case 'project':
      return { en: node.projectType, zh: node.projectType }
    case 'folder':
    case 'group': {
      const count = node.children.length
      return { en: `${count}`, zh: `${count}` }
    }
    default:
      return null
  }
})

/**
 * Radar metadata of the row. The role is the same for every node; which node this is belongs in attributes, so
 * that a course or the Copilot can address one with a selector such as `explorer-node[path="assets/videos"]`.
 * The English label is used as the name so selectors do not change with the interface language.
 * @returns A `RadarNodeMeta` for `v-radar`.
 * Read by: `CourseExplorerNode.vue#template`.
 * Called by: Vue (computed; re-evaluated when `props.node` changes)
 */
const radarNodeMeta = computed(() => ({
  name: 'explorer-node',
  desc: `Click to open ${props.node.type} ${getNodeKey(props.node)}`,
  attrs: { name: label.value.en, type: props.node.type, path: getNodeKey(props.node) }
}))

/**
 * Handle a click on the row: open the node, or fold the unused heading (it stands for no record, so there is
 * nothing to open).
 * @returns Nothing; emits either `select` or `toggle`.
 * Called by: `CourseExplorerNode.vue#template` (the row button).
 */
function handleClick() {
  if (props.node.type === 'group') {
    emit('toggle', getNodeKey(props.node))
    return
  }
  emit('select', props.node.path)
}
</script>

<template>
  <!-- One node: its row button, then (while expanded) the child rows one level deeper. -->
  <div>
    <!-- Row button: indented by `depth`, highlighted when `active`; clicking opens the node or folds a group. -->
    <button
      v-radar="radarNodeMeta"
      :class="[explorerNodeClass, active && explorerActiveNodeClass]"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      :title="$t(label)"
      @click="handleClick"
    >
      <!-- Toggle glyph of a row that holds others; flips `expanded` without opening the node (`@click.stop`). -->
      <span
        v-if="branch"
        v-radar="{
          name: 'toggle-folder-button',
          desc: 'Click to expand or collapse this group',
          attrs: { path: getNodeKey(node) }
        }"
        class="w-4 flex-none text-xs text-grey-700"
        @click.stop="emit('toggle', getNodeKey(node))"
        >{{ expanded ? '▾' : '▸' }}</span
      >
      <!-- Other rows get an empty spacer of the same width so labels line up. -->
      <span v-else class="w-4 flex-none"></span>
      <span class="truncate">{{ $t(label) }}</span>
      <!-- Hint (project type, or how many things this row holds), when the node has one. -->
      <span v-if="hint != null" class="flex-none text-xs text-grey-700">{{ $t(hint) }}</span>
      <!-- Unsaved dot. -->
      <span v-if="dirty" :class="explorerDotClass">•</span>
    </button>
    <!-- Children: only for rows that hold others, only while expanded; each re-emits `select`. -->
    <template v-if="branch && expanded">
      <CourseExplorerNode
        v-for="child in children"
        :key="getNodeKey(child)"
        :node="child"
        :depth="depth + 1"
        :active-path="activePath"
        :changed-paths="changedPaths"
        :collapsed-keys="collapsedKeys"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
      />
    </template>
  </div>
</template>
