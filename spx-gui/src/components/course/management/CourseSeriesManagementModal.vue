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
      <UIButton mode="flat" type="boring" stroke @click="handleCreate">
        <template #icon>
          <UIIcon type="plus" />
        </template>
        <span>{{ $t({ en: 'Create course series', zh: '创建课程系列' }) }}</span>
      </UIButton>
    </template>
    <section class="body">
      <ListResultWrapper v-slot="slotProps" :query-ret="queryRet" :height="352">
        <div class="content">
          <div v-if="slotProps.data.data.length === 0" class="empty">
            <p>{{ $t({ en: 'No course series yet', zh: '还没有课程系列' }) }}</p>
            <p class="hint">
              {{
                $t({
                  en: 'Click "Create course series" to add your first series',
                  zh: '点击"创建课程系列"添加第一个系列'
                })
              }}
            </p>
          </div>
          <ul v-else class="course-series-list">
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
      <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
    </section>
  </UISearchableModal>
</template>

<style lang="scss" scoped>
.body {
  display: flex;
  flex-direction: column;
  padding: 20px 24px 24px;
}

.content {
  display: flex;
  flex-direction: column;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-grey-700);

  .hint {
    font-size: 14px;
    color: var(--ui-color-grey-600);
    margin-top: 8px;
  }
}

.course-series-list {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: var(--ui-gap-middle);
}

.pagination {
  justify-content: center;
  margin: 32px 0 16px;
}

.create-button {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
