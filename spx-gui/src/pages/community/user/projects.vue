<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRouteQueryParamInt, useRouteQueryParamStrEnum } from '@/utils/route'
import { useMessageHandle, useQuery } from '@/utils/exception'
import { IsPublic, listProject, type ListProjectParams } from '@/apis/project'
import { getProjectEditorRoute } from '@/router'
import { useUserStore } from '@/stores'
import { UISelect, UISelectOption, UIPagination, UIButton } from '@/components/ui'
import { useCreateProject } from '@/components/project'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import UserContent from '@/components/community/user/content/UserContent.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'

const props = defineProps<{
  name: string
}>()

const isCurrentUser = computed(() => props.name === useUserStore().userInfo?.name)

const pageSize = 6 // 2 rows, TODO: responsive layout
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize))
const page = useRouteQueryParamInt('p', 1)

enum Order {
  RecentlyUpdated = 'update',
  MostLikes = 'likes'
}
const order = useRouteQueryParamStrEnum('o', Order, Order.RecentlyUpdated, (kvs) => ({
  ...kvs,
  p: null
}))

const listParams = computed<ListProjectParams>(() => {
  const p: ListProjectParams = {
    owner: props.name,
    pageSize,
    pageIndex: page.value
  }
  if (!isCurrentUser.value) p.isPublic = IsPublic.public
  switch (order.value) {
    case Order.RecentlyUpdated:
      p.orderBy = 'uTime'
      p.sortOrder = 'desc'
      break
    case Order.MostLikes:
      p.orderBy = 'likeCount'
      p.sortOrder = 'desc'
      break
  }
  return p
})

const queryRet = useQuery(() => listProject(listParams.value), {
  en: 'Failed to load projects',
  zh: '加载失败'
})

const router = useRouter()
const createProject = useCreateProject()
const handleNewProject = useMessageHandle(
  async () => {
    const { name } = await createProject()
    router.push(getProjectEditorRoute(name))
  },
  { en: 'Failed to create new project', zh: '新建项目失败' }
).fn
</script>

<template>
  <UserContent class="user-projects">
    <template #title>
      {{ $t({ en: 'Projects', zh: '项目' }) }}
    </template>
    <template #extra>
      <label>
        {{
          $t({
            en: 'Sort by',
            zh: '排序方式'
          })
        }}
        <UISelect v-model:value="order">
          <UISelectOption :value="Order.RecentlyUpdated">{{
            $t({
              en: 'Recently updated',
              zh: '最近更新'
            })
          }}</UISelectOption>
          <UISelectOption :value="Order.MostLikes">{{
            $t({
              en: 'Most likes',
              zh: '最受喜欢'
            })
          }}</UISelectOption>
        </UISelect>
      </label>
      <UIButton v-if="isCurrentUser" type="secondary" icon="plus" @click="handleNewProject">
        {{ $t({ en: 'New project', zh: '新建项目' }) }}
      </UIButton>
    </template>
    <ListResultWrapper v-slot="slotProps" :query-ret="queryRet" :height="538">
      <ul class="projects">
        <ProjectItem
          v-for="project in slotProps.data.data"
          :key="project.id"
          size="small"
          :context="isCurrentUser ? 'mine' : 'public'"
          :project="project"
        />
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
