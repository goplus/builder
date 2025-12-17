<template>
  <CommunityHeader>
    {{ $t({ en: 'Explore', zh: '发现' }) }}
    <template #options>
      <UIChipRadioGroup v-model:value="order">
        <UIChipRadio :value="Order.MostLikes">
          {{ $t(titles[Order.MostLikes]) }}
        </UIChipRadio>
        <UIChipRadio :value="Order.MostRemixes">
          {{ $t(titles[Order.MostRemixes]) }}
        </UIChipRadio>
        <UIChipRadio :value="Order.FollowingCreated">
          {{ $t(titles[Order.FollowingCreated]) }}
        </UIChipRadio>
      </UIChipRadioGroup>
    </template>
  </CommunityHeader>
  <CenteredWrapper class="main">
    <ListResultWrapper v-slot="slotProps" content-type="project" :query-ret="queryRet">
      <ul class="projects">
        <ProjectItem v-for="project in slotProps.data" :key="project.id" :project="project" />
      </ul>
    </ListResultWrapper>
  </CenteredWrapper>
</template>

<script setup lang="ts">
import { useQuery } from '@/utils/query'
import { useRouteQueryParamStrEnum } from '@/utils/route'
import { usePageTitle } from '@/utils/utils'
import { exploreProjects, ExploreOrder as Order } from '@/apis/project'
import { UIChipRadioGroup, UIChipRadio } from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityHeader from '@/components/community/CommunityHeader.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'
import { useEnsureSignedIn } from '@/utils/user'

const order = useRouteQueryParamStrEnum('o', Order, Order.MostLikes)

const titles = {
  [Order.MostLikes]: { en: 'Most recent likes', zh: '最近最受喜欢' },
  [Order.MostRemixes]: { en: 'Most recent remixes', zh: '最近最多改编' },
  [Order.FollowingCreated]: { en: 'My following created', zh: '你关注的用户创作' }
}

usePageTitle(() => titles[order.value])

const maxCount = 50

const ensureSignedIn = useEnsureSignedIn()

const queryRet = useQuery(
  async () => {
    if (order.value === Order.FollowingCreated) await ensureSignedIn()
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

.projects {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 20px;
}
</style>
