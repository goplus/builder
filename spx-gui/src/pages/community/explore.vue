<template>
  <CommunityHeader>
    {{ $t({ en: 'Explore', zh: '发现' }) }}
    <template #options>
      <UITagRadioGroup v-model:value="order">
        <UITagRadio :value="Order.MostLikes">
          {{ $t({ en: 'Most recent likes', zh: '最近最受喜欢' }) }}
        </UITagRadio>
        <UITagRadio :value="Order.MostRemixes">
          {{ $t({ en: 'Most recent remixes', zh: '最近最多改编' }) }}
        </UITagRadio>
        <UITagRadio :value="Order.FollowingCreated">
          {{ $t({ en: 'My following created', zh: '我关注的人创作' }) }}
        </UITagRadio>
      </UITagRadioGroup>
    </template>
  </CommunityHeader>
  <CenteredWrapper class="main">
    <UILoading v-if="isLoading" />
    <UIError v-else-if="error != null" class="error" :retry="refetch">
      {{ $t(error.userMessage) }}
    </UIError>
    <div v-else-if="projects != null && projects.length === 0" class="empty">
      <UIEmpty size="large" />
    </div>
    <ul v-else-if="projects != null" class="projects">
      <ProjectItem v-for="project in projects" :key="project.id" :project="project" />
    </ul>
  </CenteredWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouteQuery } from '@/utils/route'
import { useQuery } from '@/utils/exception'
import { exploreProjects, ExploreOrder as Order } from '@/apis/project'
import { UITagRadioGroup, UITagRadio, UILoading, UIError, UIEmpty } from '@/components/ui'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityHeader from '@/components/community/CommunityHeader.vue'
import ProjectItem from '@/components/project/item/ProjectItem.vue'

const queryParams = useRouteQuery<'o'>()

const defaultOrder = Order.MostLikes

const order = computed<Order>({
  get() {
    const orderStr = queryParams.get('o')
    if (orderStr == null || orderStr === '') return defaultOrder
    if (!Object.values(Order).includes(orderStr as Order)) return defaultOrder
    return orderStr as Order
  },
  set(o) {
    queryParams.set('o', o === defaultOrder ? null : o)
  }
})

const maxCount = 50

const {
  data: projects,
  isLoading,
  error,
  refetch
} = useQuery(
  () => {
    // TODO: login prompt for unauthenticated users
    return exploreProjects({
      order: order.value,
      count: maxCount
    })
  },
  {
    en: 'Failed to list projects',
    zh: '获取项目列表失败'
  }
)
</script>

<style lang="scss" scoped>
.main {
  flex: 1 1 0;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error,
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
</style>
