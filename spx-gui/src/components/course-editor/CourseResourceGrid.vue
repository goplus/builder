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
 * The page of one resource type of the course (its videos or its pictures), as a grid of cards. Each file the author
 * adds becomes a resource named after the file.
 */
import { computed, onUnmounted } from 'vue'
import { useMessageHandle } from '@/utils/exception'
import { useI18n } from '@/utils/i18n'
import { stripExt } from '@/utils/path'
import { selectFilesWithUploadLimit } from '@/models/common/cloud'
import { fromNativeFile } from '@/models/common/file'
import { validateImageName, validateVideoName } from '@/models/tutorial/asset-name'
import { Image, Video, type TutorialProject } from '@/models/tutorial/project'
import type { History } from '@/components/editor/history'
import RenameModal from '@/components/common/RenameModal.vue'
import { UIButton, UIEmpty, useConfirmDialog, useModal } from '@/components/ui'
import CourseResourceCard from './CourseResourceCard.vue'
import CourseResourcePreviewModal from './CourseResourcePreviewModal.vue'
import { getViewLabel, type ResourceView } from './course-views'

const props = defineProps<{
  /** The author's working copy of the Tutorial project. */
  project: TutorialProject
  /** Which resource view this is; it decides the type, the wording and the files accepted. */
  view: ResourceView
  /** The course's own history, which records every change made here. */
  history: History
}>()

const { t } = useI18n()
const confirm = useConfirmDialog()
const openPreview = useModal(CourseResourcePreviewModal)
const openRename = useModal(RenameModal)

const resources = computed(() =>
  [...(props.view === 'videos' ? props.project.videos : props.project.images)].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
)

// The files an author picks for the page must not land in a course nobody is looking at.
let disposed = false
onUnmounted(() => {
  disposed = true
})

const handleAdd = useMessageHandle(
  async () => {
    const files = await selectFilesWithUploadLimit({ accept: acceptedExts[props.view] })
    if (disposed) return
    const action = {
      name: props.view === 'videos' ? { en: 'Add videos', zh: '添加视频' } : { en: 'Add images', zh: '添加图片' }
    }
    await props.history.doAction(action, () => {
      for (const nativeFile of files) {
        const file = fromNativeFile(nativeFile)
        // The project renames a resource whose name is taken or cannot be used.
        if (props.view === 'videos') props.project.addVideo(new Video(stripExt(file.name), file))
        else props.project.addImage(new Image(stripExt(file.name), file))
      }
    })
  },
  { en: 'Failed to add files', zh: '添加文件失败' }
)

const handlePreview = useMessageHandle((resource: Video | Image) => openPreview({ resource }))

const handleRename = useMessageHandle(
  (resource: Video | Image) =>
    openRename({
      target: {
        name: resource.name,
        validateName: (name) =>
          resource instanceof Video
            ? validateVideoName(name.trim(), props.project)
            : validateImageName(name.trim(), props.project),
        applyName: async (name) => {
          const action = {
            name:
              resource instanceof Video
                ? { en: 'Rename video', zh: '重命名视频' }
                : { en: 'Rename image', zh: '重命名图片' }
          }
          await props.history.doAction(action, () => resource.setName(name.trim()))
        },
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

const handleRemove = useMessageHandle(
  async (resource: Video | Image) => {
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
    const name = resource.name
    if (resource instanceof Video) {
      const action = { name: { en: `Remove video ${name}`, zh: `删除视频 ${name}` } }
      await props.history.doAction(action, () => props.project.removeVideo(resource.id))
    } else {
      const action = { name: { en: `Remove image ${name}`, zh: `删除图片 ${name}` } }
      await props.history.doAction(action, () => props.project.removeImage(resource.id))
    }
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
        v-radar="{ name: 'add-resource-button', desc: 'Click to add files to this page', attrs: { view } }"
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
