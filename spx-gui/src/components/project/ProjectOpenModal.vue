<script setup lang="ts">
import { UIFormModal, UIPagination } from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'
import { computed, shallowRef } from 'vue'
import { useQuery } from '@/utils/query'
import { listProject } from '@/apis/project'

const props = defineProps<{
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
  () =>
    listProject({
      orderBy: 'updatedAt',
      sortOrder: 'desc',
      pageIndex: page.value,
      pageSize: pageSize
    }),
  {
    en: 'Failed to load projects',
    zh: '加载失败'
  }
)
</script>

<template>
  <UIFormModal
    :title="$t({ en: 'Open project', zh: '打开项目' })"
    :style="{ width: '1024px' }"
    :visible="props.visible"
    @update:visible="emit('cancelled')"
  >
    <ListResultWrapper v-slot="slotProps" content-type="project" :query-ret="queryRet" :height="524">
      <ul class="project-list">
        <ProjectItem
          v-for="project in slotProps.data.data"
          :key="project.id"
          :project="project"
          context="edit"
          @selected="emit('resolved')"
        />
      </ul>
    </ListResultWrapper>
    <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
  </UIFormModal>
</template>

<style scoped lang="scss">
.project-list {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: var(--ui-gap-middle);
}
.pagination {
  justify-content: center;
  margin: 32px 0 16px;
}
</style>
