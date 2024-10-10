<template>
  <section class="header">
    <CenteredWrapper class="header-content">
      <h1 class="title">
        <template v-if="titleForResult != null">
          <!-- TODO: support vnode as i18n message to simplify such case -->
          {{ $t(titleForResult.prefix) }}<span class="keyword">{{ keyword }}</span
          >{{ $t(titleForResult.suffix) }}
        </template>
        <template v-else>
          {{ $t(titleForNoResult) }}
        </template>
      </h1>
      <label class="order">
        {{
          $t({
            en: 'Sort by',
            zh: '排序方式'
          })
        }}
        <UISelect v-model:value="order">
          <UISelectOption :value="Order.RecentlyUpdated">{{
            $t({
              en: 'Recently Updated',
              zh: '最近更新'
            })
          }}</UISelectOption>
          <UISelectOption :value="Order.MostlyLiked">{{
            $t({
              en: 'Mostly Liked',
              zh: '最受喜欢'
            })
          }}</UISelectOption>
          <UISelectOption :value="Order.MostlyRemixed">{{
            $t({
              en: 'Mostly Remixed',
              zh: '改编最多'
            })
          }}</UISelectOption>
        </UISelect>
      </label>
    </CenteredWrapper>
  </section>
  <CenteredWrapper class="main">
    <UILoading v-if="isLoading" />
    <UIError v-else-if="error != null" :retry="refetch">
      {{ $t(error.userMessage) }}
    </UIError>
    <div v-else-if="result?.data.length === 0" class="empty">
      <UIEmpty size="large" />
    </div>
    <template v-else-if="result != null">
      <ul class="projects">
        <ProjectItem v-for="project in result.data" :key="project.id" :project="project" />
      </ul>
      <footer v-show="pageTotal > 1" class="pagination-wrapper">
        <UIPagination v-model:current="page" :total="pageTotal" />
      </footer>
    </template>
  </CenteredWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouteQuery } from '@/utils/route'
import { useQuery } from '@/utils/exception'
import { IsPublic, listProject, ownerAll, type ListProjectParams } from '@/apis/project'
import {
  UIError,
  UILoading,
  UISelect,
  UISelectOption,
  UIPagination,
  UIEmpty
} from '@/components/ui'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectItem from '@/components/project/item/ProjectItem.vue'

const params = useRouteQuery<'q' | 'p' | 'o'>()

const keyword = computed(() => params.get('q') ?? '')

const pageSize = 8 // 2 rows
const defaultPage = 1
const page = computed<number>({
  get() {
    const pageStr = params.get('p')
    if (pageStr == null || pageStr === '') return defaultPage
    const page = parseInt(pageStr)
    return isNaN(page) ? defaultPage : page
  },
  set(p) {
    params.set('p', p === defaultPage ? null : p.toString())
  }
})

enum Order {
  RecentlyUpdated = 'update',
  MostlyLiked = 'likes',
  MostlyRemixed = 'remix'
}
const defaultOrder = Order.RecentlyUpdated

const order = computed<Order>({
  get() {
    const orderStr = params.get('o')
    if (orderStr == null || orderStr === '') return defaultOrder
    if (!Object.values(Order).includes(orderStr as Order)) return defaultOrder
    return orderStr as Order
  },
  set(o) {
    params.set({
      o: o === defaultOrder ? null : o,
      p: null
    })
  }
})

const pageTotal = computed(() => Math.ceil((result.value?.total ?? 0) / pageSize))

const listParams = computed<ListProjectParams>(() => {
  const p: ListProjectParams = {
    isPublic: IsPublic.public,
    owner: ownerAll,
    pageSize,
    pageIndex: page.value
  }
  if (keyword.value !== '') p.keyword = keyword.value
  switch (order.value) {
    case Order.RecentlyUpdated:
      p.orderBy = 'uTime'
      p.sortOrder = 'desc'
      break
    case Order.MostlyLiked:
      p.orderBy = 'likeCount'
      p.sortOrder = 'desc'
      break
    case Order.MostlyRemixed:
      p.orderBy = 'remixCount'
      p.sortOrder = 'desc'
      break
  }
  return p
})

const {
  data: result,
  isLoading,
  error,
  refetch
} = useQuery(() => listProject(listParams.value), {
  en: 'Failed to search projects',
  zh: '搜索项目失败'
})

const titleForResult = computed(() => {
  if (result.value == null) return null
  return {
    prefix: {
      en: `Found ${result.value?.total} projects for "`,
      zh: `找到 ${result.value?.total} 个关于“`
    },
    suffix: {
      en: '"',
      zh: '”的项目'
    }
  }
})
const titleForNoResult = computed(() => ({
  en: 'Search projects',
  zh: '搜索项目'
}))
</script>

<style lang="scss" scoped>
.header {
  flex: 0 0 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ui-color-grey-100);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  .title {
    color: var(--ui-color-title);
    font-size: 16px;
    line-height: 26px;

    .keyword {
      color: var(--ui-color-primary-main);
    }
  }
}

.main {
  flex: 1 1 0;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.empty {
  flex: 1 1 0;
  display: flex;

  border-radius: var(--ui-border-radius-2);
  background: var(--ui-color-grey-100);
}

.projects {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
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
