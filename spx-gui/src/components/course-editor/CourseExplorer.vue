<script setup lang="ts">
import { computed } from 'vue'
import type { TutorialProject } from '@/models/tutorial/project'
import { isNodeDirty, type CourseNode } from './course-tree'
import CourseExplorerNode, {
  explorerActiveNodeClass,
  explorerDotClass,
  explorerNodeClass
} from './CourseExplorerNode.vue'

const props = defineProps<{
  project: TutorialProject
  tree: CourseNode[]
  /** Path of the open node; the empty path is the course itself. */
  activePath: string
  changedPaths: Set<string>
}>()

const emit = defineEmits<{
  select: [path: string]
}>()

const rootDirty = computed(() => isNodeDirty({ type: 'root' }, props.changedPaths))
</script>

<template>
  <nav
    v-radar="{
      name: 'Course explorer',
      desc: 'Tree of the course records: the course itself, its program, videos, other files and the embedded project'
    }"
    class="flex h-full flex-col gap-0.5 overflow-y-auto p-2"
  >
    <!-- The course itself is the root: its settings live in `index.json`, its title and thumbnail in course management. -->
    <button
      v-radar="{ name: 'Course root node', desc: 'Click to edit the course settings' }"
      :class="[explorerNodeClass, 'pl-2 font-semibold', activePath === '' && explorerActiveNodeClass]"
      :title="project.title"
      @click="emit('select', '')"
    >
      <span class="truncate">{{ project.title }}</span>
      <span class="flex-none text-xs font-normal text-grey-700">{{ $t({ en: 'Course', zh: '课程' }) }}</span>
      <span v-if="rootDirty" :class="explorerDotClass">•</span>
    </button>
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
