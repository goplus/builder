<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRouteQueryParamInt, useRouteQueryParamStrEnum } from '@/utils/route'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { useEnsureSignedIn } from '@/utils/user'
import { Visibility, listProject, type ListProjectParams } from '@/apis/project'
import { getOwnProjectEditorRoute } from '@/router'
import { getSignedInUsername, useUser } from '@/stores/user'
import { UISelect, UISelectOption, UIPagination, UIButton, useResponsive } from '@/components/ui'
import { useCreateProject } from '@/components/project'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import UserContent from '@/components/community/user/content/UserContent.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'

const props = defineProps<{
  name: string
}>()

const isSignedInUser = computed(() => props.name === getSignedInUsername())

const { data: user } = useUser(() => props.name)
usePageTitle(() => {
  if (user.value == null) return null
  return {
    en: `Projects of ${user.value.displayName}`,
    zh: `${user.value.displayName} 的项目`
  }
})

const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => (isDesktopLarge.value ? 5 : 4))
const pageSize = computed(() => numInRow.value * 2)
const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize.value))
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
    pageSize: pageSize.value,
    pageIndex: page.value
  }
  if (!isSignedInUser.value) p.visibility = Visibility.Public
  switch (order.value) {
    case Order.RecentlyUpdated:
      p.orderBy = 'updatedAt'
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
const ensureSignedIn = useEnsureSignedIn()
const createProject = useCreateProject()
const handleNewProject = useMessageHandle(
  async () => {
    await ensureSignedIn()
    const name = await createProject()
    router.push(getOwnProjectEditorRoute(name))
  },
  { en: 'Failed to create new project', zh: '新建项目失败' }
).fn
</script>

<template>
  <UserContent class="user-projects" :style="{ '--project-num-in-row': numInRow }">
    <template #title>
      {{ $t({ en: 'My projects', zh: '我的项目' }) }}
    </template>
    <template #extra>
      <label class="sort">
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
      <UIButton
        v-if="isSignedInUser"
        v-radar="{ name: 'New project button', desc: 'Click to create a new project' }"
        color="secondary"
        icon="plus"
        @click="handleNewProject"
      >
        {{ $t({ en: 'New project', zh: '新建项目' }) }}
      </UIButton>
    </template>
    <div class="projects-wrapper">
      <ListResultWrapper v-slot="slotProps" content-type="project" :query-ret="queryRet" :height="524">
        <ul class="projects">
          <ProjectItem
            v-for="project in slotProps.data.data"
            :key="project.id"
            size="small"
            context="mine"
            :project="project"
            @removed="queryRet.refetch()"
          />
        </ul>
      </ListResultWrapper>
      <UIPagination v-show="pageTotal > 1" v-model:current="page" class="pagination" :total="pageTotal" />
    </div>
  </UserContent>
</template>

<style lang="scss" scoped>
.sort {
  display: flex;
  align-items: center;
  gap: 8px;
}

.projects-wrapper {
  margin-top: 8px;
}

.projects {
  display: grid;
  grid-template-columns: repeat(var(--project-num-in-row), 1fr);
  gap: var(--ui-gap-middle);
}

.pagination {
  margin: 36px 0 20px;
  justify-content: center;
}
</style>
