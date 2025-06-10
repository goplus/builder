<template>
  <CommunityHeader>
    <I18nT v-if="queryRet.data.value != null">
      <template #en>
        Found {{ queryRet.data.value?.total }} projects for "<span class="keyword">{{ keyword }}</span
        >"
      </template>
      <template #zh>
        找到 {{ queryRet.data.value?.total }} 个关于“<span class="keyword">{{ keyword }}</span
        >”的项目
      </template>
    </I18nT>
    <template v-else>
      {{ $t({ en: 'Search projects', zh: '搜索项目' }) }}
    </template>
    <template #options>
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
          <UISelectOption :value="Order.MostRemixes">{{
            $t({
              en: 'Most remixes',
              zh: '最多改编'
            })
          }}</UISelectOption>
        </UISelect>
      </label>
    </template>
  </CommunityHeader>
  <CenteredWrapper class="main" :style="{ '--project-num-in-row': numInRow }">
    <ListResultWrapper v-slot="slotProps" content-type="project" :query-ret="queryRet" :height="528">
      <ul class="projects">
        <ProjectItem v-for="project in slotProps.data.data" :key="project.id" :project="project" />
      </ul>
    </ListResultWrapper>
    <footer v-show="pageTotal > 1" class="pagination-wrapper">
      <UIPagination v-model:current="page" :total="pageTotal" />
    </footer>
  </CenteredWrapper>
</template>

<script lang="ts">
// `?q=123`
export const searchKeywordQueryParamName = 'q'
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouteQueryParamInt, useRouteQueryParamStr, useRouteQueryParamStrEnum } from '@/utils/route'
import { useQuery } from '@/utils/query'
import { Visibility, listProject, ownerAll, type ListProjectParams } from '@/apis/project'
import { usePageTitle } from '@/utils/utils'
import { UISelect, UISelectOption, UIPagination, useResponsive } from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityHeader from '@/components/community/CommunityHeader.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'

usePageTitle({
  en: 'Project search results',
  zh: '项目搜索结果'
})

const keyword = useRouteQueryParamStr(searchKeywordQueryParamName, '')

const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => (isDesktopLarge.value ? 5 : 4))
const pageSize = computed(() => numInRow.value * 2)
const page = useRouteQueryParamInt('p', 1)

enum Order {
  RecentlyUpdated = 'update',
  MostLikes = 'likes',
  MostRemixes = 'remix'
}
const order = useRouteQueryParamStrEnum('o', Order, Order.RecentlyUpdated, (kvs) => ({
  ...kvs,
  p: null
}))

const pageTotal = computed(() => Math.ceil((queryRet.data.value?.total ?? 0) / pageSize.value))

const listParams = computed<ListProjectParams>(() => {
  const p: ListProjectParams = {
    visibility: Visibility.Public,
    owner: ownerAll,
    pageSize: pageSize.value,
    pageIndex: page.value
  }
  if (keyword.value !== '') p.keyword = keyword.value
  switch (order.value) {
    case Order.RecentlyUpdated:
      p.orderBy = 'updatedAt'
      p.sortOrder = 'desc'
      break
    case Order.MostLikes:
      p.orderBy = 'likeCount'
      p.sortOrder = 'desc'
      break
    case Order.MostRemixes:
      p.orderBy = 'remixCount'
      p.sortOrder = 'desc'
      break
  }
  return p
})

const queryRet = useQuery(() => listProject(listParams.value), {
  en: 'Failed to search projects',
  zh: '搜索项目失败'
})
</script>

<style lang="scss" scoped>
.keyword {
  color: var(--ui-color-primary-main);
}

.main {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.projects {
  display: grid;
  grid-template-columns: repeat(var(--project-num-in-row), 1fr);
  gap: 20px;
}

.pagination-wrapper {
  flex: 0 0 56px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  border-radius: var(--ui-border-radius-2);
  border: 1px solid var(--ui-color-grey-400);
  background: var(--ui-color-grey-100);
}
</style>
