<script lang="ts" setup>
import { computed, shallowRef } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { listCourseSeries, deleteCourseSeries, type CourseSeries } from '@/apis/course-series'
import {
  UIIcon,
  UIPagination,
  UISearchableModal,
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

const page = shallowRef(1)
const pageSize = 12
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))

const queryRet = useQuery(
  () => {
    return listCourseSeries({
      pageSize,
      pageIndex: page.value,
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
    await invokeEditModal({ courseSeries: null })
    queryRet.refetch()
  },
  {
    en: 'Failed to create course series',
    zh: '创建课程系列失败'
  }
).fn

const handleEdit = useMessageHandle(
  async (courseSeries: CourseSeries) => {
    await invokeEditModal({ courseSeries })
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
      <UIButton variant="stroke" color="boring" @click="handleCreate">
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
          <ul v-else class="flex flex-wrap content-start gap-middle">
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
