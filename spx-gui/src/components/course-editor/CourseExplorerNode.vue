<script lang="ts">
export const explorerNodeClass =
  'flex w-full items-center gap-1 rounded py-1 pr-2 text-left text-sm border-none bg-transparent cursor-pointer hover:bg-grey-400'
export const explorerActiveNodeClass = 'bg-primary-100 text-primary-main hover:bg-primary-100'
/** A dot marks a node with changes not saved yet. */
export const explorerDotClass = 'ml-1 text-primary-main'
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LocaleMessage } from '@/utils/i18n'
import { filename } from '@/utils/path'
import { videoAssetPath } from '@/models/tutorial/video'
import { UITag } from '@/components/ui'
import { isNodeDirty, type CourseNode } from './course-tree'
import { isPathWithin } from './route'

const props = defineProps<{
  node: CourseNode
  depth: number
  /** Path of the open node. */
  activePath: string
  changedPaths: Set<string>
}>()

const emit = defineEmits<{
  select: [path: string]
}>()

const expanded = ref(true)

const dirty = computed(() => isNodeDirty(props.node, props.changedPaths))

// The project node stands for everything under its root, including the Project Editor's own in-editor path.
const active = computed(() => {
  const node = props.node
  return node.type === 'project' ? isPathWithin(props.activePath, node.path) : props.activePath === node.path
})

const label = computed(() => (props.node.type === 'project' ? filename(props.node.path) : props.node.name))

const hint = computed<LocaleMessage | null>(() => {
  const node = props.node
  switch (node.type) {
    case 'project':
      return { en: `Project (${node.projectType})`, zh: `工程（${node.projectType}）` }
    case 'video':
      return { en: 'Video', zh: '视频' }
    case 'folder': {
      if (node.path !== videoAssetPath) return null
      const count = node.children.filter((child) => child.type === 'video').length
      return { en: `Videos (${count})`, zh: `视频（${count}）` }
    }
    case 'file':
      return node.known ? { en: 'Course program', zh: '课程程序' } : null
    default:
      return null
  }
})
</script>

<template>
  <div>
    <button
      v-radar="{ name: `Explorer node ${node.path}`, desc: `Click to open ${node.type} ${node.path}` }"
      :class="[explorerNodeClass, active && explorerActiveNodeClass]"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      :title="node.path"
      @click="emit('select', node.path)"
    >
      <span
        v-if="node.type === 'folder'"
        v-radar="{ name: `Toggle folder ${node.path}`, desc: 'Click to expand or collapse this folder' }"
        class="w-4 flex-none text-xs text-grey-700"
        @click.stop="expanded = !expanded"
        >{{ expanded ? '▾' : '▸' }}</span
      >
      <span v-else class="w-4 flex-none"></span>
      <span class="truncate">{{ label }}</span>
      <span v-if="hint != null" class="flex-none text-xs text-grey-700">{{ $t(hint) }}</span>
      <UITag
        v-if="node.type === 'file' && !node.known"
        class="flex-none"
        color="warning"
        :title="$t({ en: 'The course does not use this file', zh: '课程不会使用此文件' })"
        >{{ $t({ en: 'Unused', zh: '未使用' }) }}</UITag
      >
      <span v-if="dirty" :class="explorerDotClass">•</span>
    </button>
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
