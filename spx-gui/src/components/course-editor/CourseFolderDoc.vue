<script setup lang="ts">
/**
 * Document shown when a resource group of the course tree is open (the videos, the pictures, or a kind some
 * course brought along). It lists the packages of that kind as buttons that open them, says what the course
 * program can do with them, and offers adding another one of the same kind.
 *
 * Props:
 * - `node`: the open `FolderNode`; its `name` is the resource kind and its `children` are already sorted.
 *
 * Emits:
 * - `open`: payload is a package's path; `CourseEditor.vue` navigates to it (`@open="openPath"`).
 * - `upload`: payload is the upload type of this group; `CourseEditor.vue` opens the upload modal on it
 *   (`@upload="(type) => handleUpload.fn(type)"`).
 *
 * Used by:
 * - components/course-editor/CourseEditor.vue#template (the `doc.node.type === 'folder'` branch, keyed by path)
 *
 * Uses:
 * - components/ui UIButton, UIEmpty
 * - models/tutorial/resource (videosKind, imagesKind)
 * - components/course-editor/course-tree.ts (getNodeLabel, getNodeKey)
 * - components/course-editor/upload.ts (UploadType)
 */
import { computed } from 'vue'
import { imagesKind, videosKind } from '@/models/tutorial/resource'
import { UIButton, UIEmpty } from '@/components/ui'
import { getNodeKey, getNodeLabel, type CourseNode, type FolderNode } from './course-tree'
import type { UploadType } from './upload'

const props = defineProps<{
  node: FolderNode
}>()

const emit = defineEmits<{
  open: [path: string]
  /** Add another thing of this group's kind. */
  upload: [type: UploadType]
}>()

/**
 * The upload type that adds to this group, or null for a kind the upload modal does not offer (a kind some
 * course carries that this editor knows nothing about); the add button is hidden then.
 *
 * @returns `'video'`, `'picture'`, or `null`.
 *
 * Called by:
 * - components/course-editor/CourseFolderDoc.vue#template (the add button and its label)
 */
const uploadType = computed<UploadType | null>(() => {
  switch (props.node.name) {
    case videosKind:
      return 'video'
    case imagesKind:
      return 'picture'
    default:
      return null
  }
})

/**
 * What this group is called (`getNodeLabel`), for the header.
 *
 * @returns A `LocaleMessage` for `$t`.
 *
 * Called by:
 * - components/course-editor/CourseFolderDoc.vue#template (the title)
 */
const label = computed(() => getNodeLabel(props.node))

/**
 * Display name of a child. Only packages live in a resource group, so this is their name; anything else falls
 * back to its label, which is never empty.
 *
 * @param child - A child node of this group.
 * @returns The text shown on the child's button.
 *
 * Called by:
 * - components/course-editor/CourseFolderDoc.vue#template (each child button)
 */
function childLabel(child: CourseNode) {
  return child.type === 'resource' ? child.name : getNodeLabel(child).en
}
</script>

<template>
  <!-- The whole document scrolls vertically. -->
  <div class="flex h-full flex-col gap-3 overflow-y-auto p-4">
    <!-- Header: what this group is, and (for a kind the editor can add) the add button. -->
    <div class="flex items-center justify-between gap-3">
      <h2 class="m-0 truncate text-base font-semibold">{{ $t(label) }}</h2>
      <UIButton
        v-if="uploadType != null"
        v-radar="{ name: 'upload-button', desc: 'Click to add another one of these to the course' }"
        type="secondary"
        size="small"
        @click="emit('upload', uploadType)"
      >
        {{
          uploadType === 'video'
            ? $t({ en: 'Add video...', zh: '添加视频...' })
            : $t({ en: 'Add picture...', zh: '添加图片...' })
        }}
      </UIButton>
    </div>
    <!-- What the course program can do with what is in here. -->
    <p v-if="uploadType === 'video'" class="m-0 text-sm text-grey-700">
      {{
        $t({
          en: 'The course program plays a video by its name, for example',
          zh: '课程程序按名字播放视频，例如'
        })
      }}
      <code>showVideo "step-to"</code>
    </p>
    <p v-else class="m-0 text-sm text-grey-700">
      {{
        $t({
          en: 'These are kept with the course. No course-program call uses them yet.',
          zh: '这些内容随课程一起保存。目前还没有课程程序调用会用到它们。'
        })
      }}
    </p>
    <!-- Empty state: the videos and pictures groups exist before anything is added to them. -->
    <UIEmpty v-if="node.children.length === 0" size="small">
      {{ $t({ en: 'Nothing here yet', zh: '这里还什么都没有' }) }}
    </UIEmpty>
    <!-- Otherwise one button per child (already sorted by the tree). -->
    <ul v-else class="m-0 flex list-none flex-col gap-1 p-0">
      <li v-for="child in node.children" :key="getNodeKey(child)">
        <button
          v-radar="{
            name: 'folder-item',
            desc: 'Click to open this item',
            attrs: { name: childLabel(child), type: child.type, path: getNodeKey(child) }
          }"
          class="flex w-full cursor-pointer items-center gap-2 rounded border border-line bg-transparent px-3 py-2 text-left text-sm hover:bg-grey-400"
          @click="child.type !== 'group' && emit('open', child.path)"
        >
          <span class="truncate">{{ childLabel(child) }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
