<script setup lang="ts">
import { UIFormModal, UIPagination } from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'
import { computed, shallowRef } from 'vue'
import { useQuery } from '@/utils/query'
import { listProject, ProjectType } from '@/apis/project'

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
      // This modal will list projects across types in a later design.
      type: ProjectType.Game,
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
    :radar="{ name: 'Project open modal', desc: 'Modal for opening projects' }"
    :title="$t({ en: 'Open project', zh: '打开项目' })"
    :style="{ width: '1024px' }"
    :visible="props.visible"
    @update:visible="emit('cancelled')"
  >
    <ListResultWrapper v-slot="slotProps" content-type="project" :query-ret="queryRet" :height="524">
      <ul class="flex flex-wrap content-start gap-middle">
        <ProjectItem
          v-for="project in slotProps.data.data"
          :key="project.id"
          :project="project"
          context="edit"
          @selected="emit('resolved')"
        />
      </ul>
    </ListResultWrapper>
    <UIPagination v-show="pageTotal > 1" v-model:current="page" class="mt-8 mb-4 justify-center" :total="pageTotal" />
  </UIFormModal>
</template>
