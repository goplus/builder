<script setup lang="ts">
import { computed } from 'vue'
import { useRouteQueryParamInt } from '@/utils/route'
import { useQuery } from '@/utils/exception'
import { listProject } from '@/apis/project'
import { UIPagination } from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import UserContent from '@/components/community/user/content/UserContent.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'

const props = defineProps<{
  name: string
}>()

const pageSize = 6 // 2 rows, TODO: responsive layout
const page = useRouteQueryParamInt('p', 1)
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))

const queryRet = useQuery(
  () =>
    listProject({
      // TODO: check order here
      liker: props.name,
      pageSize,
      pageIndex: page.value
    }),
  {
    en: 'Failed to load projects',
    zh: '加载失败'
  }
)
</script>

<template>
  <UserContent class="user-likes">
    <template #title>
      {{ $t({ en: 'Projects I like', zh: '我喜欢的项目' }) }}
    </template>
    <ListResultWrapper v-slot="slotProps" :query-ret="queryRet" :height="538">
      <ul class="projects">
        <ProjectItem v-for="project in slotProps.data.data" :key="project.id" :project="project" />
      </ul>
    </ListResultWrapper>
    <UIPagination
      v-show="pageTotal > 1"
      v-model:current="page"
      :total="pageTotal"
      style="justify-content: center"
    />
  </UserContent>
</template>

<style lang="scss" scoped>
.projects {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: var(--ui-gap-middle);
}
</style>
