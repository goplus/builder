<script lang="ts" setup>
import { computed, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/utils/i18n'
import { DefaultException, useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import {
  isGuidedCourse,
  listSignedInUserCourses,
  deleteCourse,
  type Course,
  type CourseKind,
  type PlaygroundCourse
} from '@/apis/course'
import { getCourseEditorRoute } from '@/apps/xbuilder/router'
import {
  UIButton,
  UIIcon,
  UIPagination,
  UISearchableModal,
  UITabRadio,
  UITabRadioGroup,
  useModal,
  useConfirmDialog,
  useMessage
} from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CourseItem from './CourseItem.vue'
import CourseItemCornerMenu from './CourseItemCornerMenu.vue'
import CourseEditModal from './CourseEditModal.vue'
import PlaygroundCourseEditModal from './playground/PlaygroundCourseEditModal.vue'
import { findSeriesOfCourse } from './playground/series'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

// Which kind of course is listed. The two kinds are managed in one place but never mixed: they are created and
// edited differently, and the server filters by kind so that pages and totals describe what is shown.
const kind = shallowRef<CourseKind>('guided')

const page = shallowRef(1)
const pageSize = 8
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))
watch(kind, () => (page.value = 1))

/** `UITabRadioGroup` speaks strings; the two tabs are the two course kinds, so anything else is ignored. */
function handleKindUpdate(value: string) {
  if (value === 'guided' || value === 'playground') kind.value = value
}

const queryRet = useQuery(
  () => {
    return listSignedInUserCourses({
      kind: kind.value,
      pageSize,
      pageIndex: page.value,
      orderBy: 'updatedAt',
      sortOrder: 'desc'
    })
  },
  {
    en: 'Failed to list courses',
    zh: '获取课程列表失败'
  }
)

const i18n = useI18n()
const m = useMessage()
const confirm = useConfirmDialog()
const router = useRouter()

const invokeGuidedEditModal = useModal(CourseEditModal)
const invokePlaygroundEditModal = useModal(PlaygroundCourseEditModal)

/**
 * Open a Playground Course in the Course Editor. The editor addresses a course through the series it is written
 * for, so the series is looked up first; a course that is in none cannot be opened yet.
 */
const handleOpenInCourseEditor = useMessageHandle(
  async (course: PlaygroundCourse) => {
    const courseSeries = await m.withLoading(
      findSeriesOfCourse(course.id),
      i18n.t({ en: 'Opening course', zh: '打开课程中' })
    )
    if (courseSeries == null) {
      throw new DefaultException({
        en: `"${course.title}" is not in any course series yet. Add it to one in "Manage course series" first.`,
        zh: `"${course.title}"还不属于任何课程系列，请先在"管理课程系列"里把它加入一个系列。`
      })
    }
    // Close first: the modal lives above the page and would otherwise cover the editor it just opened.
    emit('resolved')
    await router.push(getCourseEditorRoute(courseSeries.id, course.id))
  },
  {
    en: 'Failed to open course',
    zh: '打开课程失败'
  }
).fn

const handleCreate = useMessageHandle(
  async () => {
    if (kind.value === 'guided') {
      await invokeGuidedEditModal({ course: null })
      queryRet.refetch()
      return
    }
    // A Playground Course is written in the Course Editor, so creating one goes straight there.
    const { course, courseSeries } = await invokePlaygroundEditModal({ course: null })
    if (courseSeries == null) {
      queryRet.refetch()
      return
    }
    emit('resolved')
    await router.push(getCourseEditorRoute(courseSeries.id, course.id))
  },
  {
    en: 'Failed to create course',
    zh: '创建课程失败'
  }
).fn

const handleEdit = useMessageHandle(
  async (course: Course) => {
    if (isGuidedCourse(course)) await invokeGuidedEditModal({ course })
    else await invokePlaygroundEditModal({ course })
    queryRet.refetch()
  },
  {
    en: 'Failed to edit course',
    zh: '编辑课程失败'
  }
).fn

const handleRemove = useMessageHandle(
  async (course: Course) => {
    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Remove course', zh: '删除课程' }),
      content: i18n.t({
        en: `Are you sure to remove "${course.title}"?`,
        zh: `确定要删除"${course.title}"吗？`
      })
    })
    await m.withLoading(deleteCourse(course.id), i18n.t({ en: 'Removing course', zh: '删除课程中' }))
    queryRet.refetch()
  },
  {
    en: 'Failed to remove course',
    zh: '删除课程失败'
  }
).fn

/**
 * Clicking a Playground Course opens it in the Course Editor, where its content lives. A guided course has no
 * editor beyond its form, which stays where it was, in the corner menu.
 */
function handleOpen(course: Course) {
  if (!isGuidedCourse(course)) handleOpenInCourseEditor(course)
}
</script>

<template>
  <UISearchableModal
    style="width: 1024px"
    :visible="visible"
    :title="$t({ en: 'Manage courses', zh: '管理课程' })"
    @update:visible="emit('cancelled')"
  >
    <template #input>
      <!-- The two kinds are two views of one list, exactly one of which is shown: a segmented switch, not a set
           of filters. The header slot lays its content out side by side without spacing, hence the margin. -->
      <UITabRadioGroup
        v-radar="{ name: 'course-kind-switch', desc: 'Switch between guided and Playground' }"
        class="mr-3 w-44"
        :value="kind"
        @update:value="handleKindUpdate"
      >
        <UITabRadio value="guided">{{ $t({ en: 'Guided', zh: '引导式' }) }}</UITabRadio>
        <UITabRadio value="playground">{{ $t({ en: 'Playground', zh: '目标式' }) }}</UITabRadio>
      </UITabRadioGroup>
      <UIButton type="neutral" @click="handleCreate">
        <template #icon>
          <UIIcon type="plus" />
        </template>
        <span>{{ $t({ en: 'Create course', zh: '创建课程' }) }}</span>
      </UIButton>
    </template>
    <section class="flex flex-col px-6 pt-5 pb-6">
      <ListResultWrapper v-slot="slotProps" :query-ret="queryRet" :height="444">
        <div class="flex flex-col">
          <div
            v-if="slotProps.data.data.length === 0"
            class="flex-1 flex flex-col items-center justify-center text-grey-700"
          >
            <p>{{ $t({ en: 'No courses yet', zh: '还没有课程' }) }}</p>
            <p class="mt-2 text-base text-grey-600">
              {{
                $t({
                  en: 'Click "Create course" to add your first course',
                  zh: '点击"创建课程"添加第一个课程'
                })
              }}
            </p>
          </div>
          <ul v-else class="flex flex-wrap content-start gap-xl">
            <CourseItem
              v-for="course in slotProps.data.data"
              :key="course.id"
              :course="course"
              @click="handleOpen(course)"
            >
              <CourseItemCornerMenu :course="course" @edit="handleEdit(course)" @remove="handleRemove(course)" />
            </CourseItem>
          </ul>
        </div>
      </ListResultWrapper>
      <UIPagination v-show="pageTotal > 1" v-model:current="page" class="mt-8 mb-4 justify-center" :total="pageTotal" />
    </section>
  </UISearchableModal>
</template>
