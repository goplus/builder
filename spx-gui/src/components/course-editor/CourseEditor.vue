<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from '@/utils/i18n'
import type { PlaygroundCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'
import type { TutorialProject } from '@/models/tutorial/project'
import type { EditorState } from '@/components/editor/editor-state'
import EditorHistoryButtons from '@/components/editor/navbar/EditorHistoryButtons.vue'
import EditorModeSwitch from '@/components/editor/navbar/EditorModeSwitch.vue'
import NavbarWrapper from '@/components/navbar/NavbarWrapper.vue'
import { UIButton, UITag, useConfirmDialogWithResult } from '@/components/ui'
import { getProjectEditorHost } from './project'

const props = defineProps<{
  course: PlaygroundCourse
  series: CourseSeries
  /** The author's working copy of the Tutorial project; the page owns its lifecycle. */
  project: TutorialProject
}>()

const { t } = useI18n()
const confirm = useConfirmDialogWithResult()

const config = computed(() => {
  const config = props.project.config
  if (config == null) throw new Error('Tutorial project has not been loaded')
  return config
})
const projectEditorHost = computed(() => getProjectEditorHost(config.value.project.type))

const editorState = shallowRef<EditorState | null>(null)

// Track unsaved changes across everything the Tutorial project exports, plus its metadata.
const dirty = ref(false)
watch(
  () => [props.project.exportFiles(), props.project.title, props.project.thumbnail],
  () => {
    dirty.value = true
  }
)

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  return confirm({
    title: t({ en: 'Leave course editor', zh: '离开课程编辑器' }),
    content: t({
      en: 'Unsaved changes to the course will be lost if you leave now. Are you sure to leave?',
      zh: '若现在离开，课程的未保存修改将会丢失。确定要离开吗？'
    }),
    cancelText: t({ en: 'Keep editing', zh: '继续编辑' }),
    confirmText: t({ en: 'Leave', zh: '离开' })
  })
})

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) event.preventDefault()
}

function preventDefaultSaveBehavior(event: KeyboardEvent) {
  const { metaKey, ctrlKey, key } = event
  // command/ctrl + s
  if ((metaKey || ctrlKey) && key.toLowerCase() === 's') {
    event.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('keydown', preventDefaultSaveBehavior)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('keydown', preventDefaultSaveBehavior)
})
</script>

<template>
  <section class="min-h-full w-full flex flex-col bg-grey-300">
    <header class="flex-none">
      <NavbarWrapper>
        <template #left>
          <EditorHistoryButtons :state="editorState" />
        </template>
        <template #center>
          <div
            v-radar="{
              name: 'Course editor title',
              desc: 'Title of the course being edited, its series and unsaved state'
            }"
            class="flex min-w-0 items-center gap-2"
          >
            <span class="truncate font-semibold">{{ course.title }}</span>
            <span class="truncate text-sm text-grey-700">{{ series.title }}</span>
            <UITag v-if="dirty">{{ $t({ en: 'Unsaved', zh: '未保存' }) }}</UITag>
          </div>
        </template>
        <template #right>
          <EditorModeSwitch :state="editorState" />
          <UIButton
            v-radar="{ name: 'Preview course button', desc: 'Click to preview the course as a learner' }"
            class="mr-2"
            type="secondary"
            size="small"
            disabled
          >
            {{ $t({ en: 'Preview', zh: '预览' }) }}
          </UIButton>
          <UIButton
            v-radar="{ name: 'Save course button', desc: 'Click to save the course' }"
            class="mr-3"
            type="primary"
            size="small"
            disabled
          >
            {{ $t({ en: 'Save', zh: '保存' }) }}
          </UIButton>
        </template>
      </NavbarWrapper>
    </header>
    <main class="flex-[1_1_0] flex gap-xl p-4 pt-2">
      <component
        :is="projectEditorHost"
        v-model:editor-state="editorState"
        :project="project.project"
        :initial-path="config.inEditorPath"
      />
    </main>
  </section>
</template>
