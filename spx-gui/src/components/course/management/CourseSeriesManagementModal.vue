<script lang="ts" setup>
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import type { CourseKind } from '@/apis/course'
import { listSignedInUserCourseSeries, deleteCourseSeries, type CourseSeries } from '@/apis/course-series'
import {
  UIIcon,
  UIPagination,
  UISearchableModal,
  UITabRadio,
  UITabRadioGroup,
  useModal,
  useConfirmDialog,
  useMessage,
  UIButton
} from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CourseSeriesItem from './CourseSeriesItem.vue'
import CourseSeriesItemCornerMenu from './CourseSeriesItemCornerMenu.vue'
import CourseSeriesEditModal from './CourseSeriesEditModal.vue'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

// Which kind of series is listed; a series only ever holds courses of its own kind.
const kind = shallowRef<CourseKind>('guided')

const page = shallowRef(1)
const pageSize = 12
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))
watch(kind, () => (page.value = 1))

/** `UITabRadioGroup` speaks strings; the two tabs are the two course kinds, so anything else is ignored. */
function handleKindUpdate(value: string) {
  if (value === 'guided' || value === 'playground') kind.value = value
}

const queryRet = useQuery(
  () => {
    return listSignedInUserCourseSeries({
      pageSize,
      pageIndex: page.value,
      kind: kind.value,
      orderBy: 'order',
      sortOrder: 'asc'
    })
  },
  {
    en: 'Failed to list course series',
    zh: '获取课程系列列表失败'
  }
)

const i18n = useI18n()
const m = useMessage()
const confirm = useConfirmDialog()

const invokeEditModal = useModal(CourseSeriesEditModal)

const handleCreate = useMessageHandle(
  async () => {
    await invokeEditModal({ courseSeries: null, kind: kind.value })
    queryRet.refetch()
  },
  {
    en: 'Failed to create course series',
    zh: '创建课程系列失败'
  }
).fn

const handleEdit = useMessageHandle(
  async (courseSeries: CourseSeries) => {
    await invokeEditModal({ courseSeries, kind: courseSeries.kind })
    queryRet.refetch()
  },
  {
    en: 'Failed to edit course series',
    zh: '编辑课程系列失败'
  }
).fn

const handleRemove = useMessageHandle(
  async (courseSeries: CourseSeries) => {
    await confirm({
      type: 'warning',
      title: i18n.t({ en: 'Remove course series', zh: '删除课程系列' }),
      content: i18n.t({
        en: `Are you sure to remove "${courseSeries.title}"?`,
        zh: `确定要删除"${courseSeries.title}"吗？`
      })
    })
    await m.withLoading(
      deleteCourseSeries(courseSeries.id),
      i18n.t({ en: 'Removing course series', zh: '删除课程系列中' })
    )
    queryRet.refetch()
  },
  {
    en: 'Failed to remove course series',
    zh: '删除课程系列失败'
  }
).fn
</script>

<template>
  <UISearchableModal
    style="width: 1024px"
    :visible="visible"
    :title="$t({ en: 'Manage course series', zh: '管理课程系列' })"
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
        <span>{{ $t({ en: 'Create course series', zh: '创建课程系列' }) }}</span>
      </UIButton>
    </template>
    <section class="flex flex-col px-6 pt-5 pb-6">
      <ListResultWrapper v-slot="slotProps" :query-ret="queryRet" :height="352">
        <div class="flex flex-col">
          <div
            v-if="slotProps.data.data.length === 0"
            class="flex-1 flex flex-col items-center justify-center text-grey-700"
          >
            <p>{{ $t({ en: 'No course series yet', zh: '还没有课程系列' }) }}</p>
            <p class="mt-2 text-base text-grey-600">
              {{
                $t({
                  en: 'Click "Create course series" to add your first series',
                  zh: '点击"创建课程系列"添加第一个系列'
                })
              }}
            </p>
          </div>
          <ul v-else class="flex flex-wrap content-start gap-xl">
            <CourseSeriesItem
              v-for="courseSeries in slotProps.data.data"
              :key="courseSeries.id"
              :course-series="courseSeries"
            >
              <CourseSeriesItemCornerMenu
                :course-series="courseSeries"
                @edit="handleEdit(courseSeries)"
                @remove="handleRemove(courseSeries)"
              />
            </CourseSeriesItem>
          </ul>
        </div>
      </ListResultWrapper>
      <UIPagination v-show="pageTotal > 1" v-model:current="page" class="mt-8 mb-4 justify-center" :total="pageTotal" />
    </section>
  </UISearchableModal>
</template>
