<script lang="ts" setup>
import { computed, shallowRef } from 'vue'
import { useI18n } from '@/utils/i18n'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { listCourse, deleteCourse, type Course } from '@/apis/course'
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
import CourseItem from './CourseItem.vue'
import CourseItemCornerMenu from './CourseItemCornerMenu.vue'
import CourseEditModal from './CourseEditModal.vue'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const page = shallowRef(1)
const pageSize = 8
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))

const queryRet = useQuery(
  () => {
    return listCourse({
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

const invokeEditModal = useModal(CourseEditModal)

const handleCreate = useMessageHandle(
  async () => {
    await invokeEditModal({ course: null })
    queryRet.refetch()
  },
  {
    en: 'Failed to create course',
    zh: '创建课程失败'
  }
).fn

const handleEdit = useMessageHandle(
  async (course: Course) => {
    await invokeEditModal({ course })
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
</script>

<template>
  <UISearchableModal
    style="width: 1024px"
    :visible="visible"
    :title="$t({ en: 'Manage courses', zh: '管理课程' })"
    @update:visible="emit('cancelled')"
  >
    <template #input>
      <UIButton mode="flat" type="boring" stroke @click="handleCreate">
        <template #icon>
          <UIIcon type="plus" />
        </template>
        <span>{{ $t({ en: 'Create course', zh: '创建课程' }) }}</span>
      </UIButton>
    </template>
    <section class="body">
      <ListResultWrapper v-slot="slotProps" :query-ret="queryRet" :height="444">
        <div class="content">
          <div v-if="slotProps.data.data.length === 0" class="empty">
            <p>{{ $t({ en: 'No courses yet', zh: '还没有课程' }) }}</p>
            <p class="hint">
              {{
                $t({
                  en: 'Click "Create course" to add your first course',
                  zh: '点击"创建课程"添加第一个课程'
                })
              }}
            </p>
          </div>
          <ul v-else class="course-list">
            <CourseItem v-for="course in slotProps.data.data" :key="course.id" :course="course">
              <CourseItemCornerMenu :course="course" @edit="handleEdit(course)" @remove="handleRemove(course)" />
            </CourseItem>
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

.course-list {
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
