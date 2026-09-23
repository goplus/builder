<script lang="ts">
import { imgExts } from '@/utils/file'

/**
 * The files each page accepts, by extension: videos in the formats browsers play, pictures in the formats the rest
 * of the editor takes, plus GIF, which a course may use for a short animation.
 */
const acceptedExts = {
  videos: ['mp4', 'webm', 'mov'],
  images: [...imgExts, 'gif']
}
</script>

<script setup lang="ts">
/**
 * Purpose: The page of one resource kind of the course -- the videos or the pictures -- laid out as a grid of cards
 * like the course management lists. Adding happens here: the page says what is being added, so the author only
 * picks the files, and each becomes a resource of this kind. A card previews its resource when clicked; its corner
 * menu renames or deletes it. Nothing is saved until the author saves the course.
 *
 * Props:
 * - `project`: the author's working copy of the Tutorial project; resources are read from and written to it.
 * - `view`: which resource view this is; it decides the kind, the wording and the files accepted.
 *
 * Used by: `components/course-editor/CourseEditor.vue#template` (the videos and pictures views, keyed by view).
 *
 * Uses: CourseResourceCard, CourseResourcePreviewModal and `components/common/RenameModal.vue` (through
 * `useModal`), the confirm dialog, `models/common/cloud#selectFilesWithUploadLimit`, `./upload`
 * (`validateResourceUpload`, `addUploadedResources`), `./course-views`.
 */
import { computed, onUnmounted } from 'vue'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { selectFilesWithUploadLimit } from '@/models/common/cloud'
import type { TutorialProject } from '@/models/tutorial/project'
import { validateResourceLayout, type Resource } from '@/models/tutorial/resource'
import RenameModal from '@/components/common/RenameModal.vue'
import { UIButton, UIEmpty, useConfirmDialog, useModal } from '@/components/ui'
import CourseResourceCard from './CourseResourceCard.vue'
import CourseResourcePreviewModal from './CourseResourcePreviewModal.vue'
import { getViewLabel, viewResourceKinds, type ResourceView } from './course-views'
import { addUploadedResources, validateResourceUpload } from './upload'

const props = defineProps<{
  /** The author's working copy of the Tutorial project. */
  project: TutorialProject
  /** Which resource view this is. */
  view: ResourceView
}>()

const { t } = useI18n()
const confirm = useConfirmDialog()
const openPreview = useModal(CourseResourcePreviewModal)
const openRename = useModal(RenameModal)

/**
 * The resource kind this page shows.
 * Read by: `resources`, the handlers below, `CourseResourceGrid.vue#template`.
 */
const kind = computed(() => viewResourceKinds[props.view])

/**
 * The resources of this page's kind, by name.
 * Read by: `CourseResourceGrid.vue#template`.
 * Called by: Vue (computed; re-evaluated when the project's resources change)
 */
const resources = computed(() =>
  props.project.resources
    .filter((resource) => resource.kind === kind.value)
    .sort((a, b) => a.name.localeCompare(b.name))
)

/**
 * Whether the page is gone: the files an author picks for it must not land in a course nobody is looking at.
 * Written by: `onUnmounted`. Read by: `handleAdd`.
 */
let disposed = false
onUnmounted(() => {
  disposed = true
})

/**
 * Add files: pick them (only the kinds of file this page takes are offered), then add each as a resource of this
 * page's kind. A refusal is shown as the error toast; closing the file picker is not an error.
 * Called by: `CourseResourceGrid.vue#template` (the add buttons).
 */
const handleAdd = useMessageHandle(
  async () => {
    const error = validateResourceUpload(props.project, kind.value)
    if (error != null) throw new DefaultException(error)
    const files = await selectFilesWithUploadLimit({ accept: acceptedExts[props.view] })
    if (disposed) return
    addUploadedResources(props.project, kind.value, files)
  },
  { en: 'Failed to add files', zh: '添加文件失败' }
)

/**
 * Show a resource at full size. Closing the preview is how it ends, not a failure.
 * @param resource - The resource whose card was clicked.
 * Called by: `CourseResourceGrid.vue#template` (`CourseResourceCard @preview`).
 */
const handlePreview = useMessageHandle((resource: Resource) => openPreview({ resource }))

/**
 * Rename a resource in the shared rename dialog. The name is what the course program plays a video by, so for a
 * video the dialog also warns that the program has to follow.
 * @param resource - The resource whose menu was used.
 * Called by: `CourseResourceGrid.vue#template` (`CourseResourceCard @rename`).
 */
const handleRename = useMessageHandle(
  (resource: Resource) =>
    openRename({
      target: {
        name: resource.name,
        validateName: (name) =>
          validateResourceLayout(
            { kind: resource.kind, name: name.trim(), file: resource.file, extraFiles: resource.extraFiles },
            props.project
          ),
        applyName: async (name) => resource.setName(name.trim()),
        inputTip:
          props.view === 'videos'
            ? { en: 'The course program plays the video by this name', zh: '课程程序按这个名字播放视频' }
            : { en: 'The name the picture is kept under in the course', zh: '图片在课程里保存用的名字' },
        warning:
          props.view === 'videos'
            ? {
                en: 'The course program refers to videos by name: after renaming, update it to use the new name.',
                zh: '课程程序按名字引用视频：改名之后，请在课程程序里改用新名字。'
              }
            : null
      }
    }),
  { en: 'Failed to rename', zh: '重命名失败' }
)

/**
 * Delete a resource after the author confirms. Like every other edit, it only reaches the course when the course
 * is saved.
 * @param resource - The resource whose menu was used.
 * Called by: `CourseResourceGrid.vue#template` (`CourseResourceCard @remove`).
 */
const handleRemove = useMessageHandle(
  async (resource: Resource) => {
    await confirm({
      title: t({ en: `Delete "${resource.name}"`, zh: `删除“${resource.name}”` }),
      content:
        props.view === 'videos'
          ? t({
              en: 'The course program plays videos by name: a call that still names this one will no longer find it.',
              zh: '课程程序按名字播放视频：仍然引用它的地方将找不到它。'
            })
          : t({ en: 'It will no longer be kept with the course.', zh: '它将不再随课程保存。' }),
      confirmText: t({ en: 'Delete', zh: '删除' })
    })
    props.project.removeResource(resource.id)
  },
  { en: 'Failed to delete', zh: '删除失败' }
)
</script>

<template>
  <div class="flex h-full flex-col gap-3 overflow-y-auto p-4">
    <header class="flex flex-none items-center justify-between gap-3">
      <h2 class="m-0 flex items-baseline gap-2 truncate text-base font-semibold">
        {{ $t(getViewLabel(view)) }}
        <span class="text-sm font-normal text-grey-700">{{ resources.length }}</span>
      </h2>
      <UIButton
        v-radar="{ name: 'add-resource-button', desc: 'Click to add files to this page', attrs: { kind } }"
        type="secondary"
        size="small"
        @click="handleAdd.fn"
      >
        {{
          view === 'videos'
            ? $t({ en: 'Add videos...', zh: '添加视频...' })
            : $t({ en: 'Add pictures...', zh: '添加图片...' })
        }}
      </UIButton>
    </header>
    <UIEmpty v-if="resources.length === 0" class="m-auto" size="small">
      {{
        view === 'videos'
          ? $t({ en: 'No videos yet', zh: '还没有视频' })
          : $t({ en: 'No pictures yet', zh: '还没有图片' })
      }}
    </UIEmpty>
    <ul
      v-else
      class="m-0 grid list-none gap-4 p-0"
      style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))"
    >
      <CourseResourceCard
        v-for="resource in resources"
        :key="resource.id"
        :resource="resource"
        @preview="handlePreview.fn(resource)"
        @rename="handleRename.fn(resource)"
        @remove="handleRemove.fn(resource)"
      />
    </ul>
  </div>
</template>
