<template>
  <CommunityHeader>
    {{ $t({ en: 'Explore', zh: '发现' }) }}
    <template #options>
      <UITagRadioGroup v-model:value="order">
        <UITagRadio :value="Order.MostLikes">
          <template v-if="!isMobile">
            {{ $t(titles[Order.MostLikes]) }}
          </template>
          <template v-else>
            <UIIcon type="heart" />
          </template>
        </UITagRadio>
        <UITagRadio :value="Order.MostRemixes">
          <template v-if="!isMobile">
            {{ $t(titles[Order.MostRemixes]) }}
          </template>
          <template v-else>
            <UIIcon type="remix" />
          </template>
        </UITagRadio>
        <UITagRadio :value="Order.FollowingCreated">
          <template v-if="!isMobile">
            {{ $t(titles[Order.FollowingCreated]) }}
          </template>
          <template v-else>
            <UIIcon type="eye" />
          </template>
        </UITagRadio>
      </UITagRadioGroup>
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
import { UITagRadioGroup, UITagRadio, UIIcon } from '@/components/ui'
import ListResultWrapper from '@/components/common/ListResultWrapper.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import CommunityHeader from '@/components/community/CommunityHeader.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'
import { useEnsureSignedIn } from '@/utils/user'
import { useResponsive } from '@/components/ui/responsive'
const order = useRouteQueryParamStrEnum('o', Order, Order.MostLikes)
const isMobile = useResponsive('mobile')
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
@import '@/components/ui/responsive.scss';

.main {
  font-size: 16px;
  flex: 1 1 0;
  padding: 1.25em 0;
  display: flex;
  flex-direction: column;
  gap: 1.25em;

  @include responsive(mobile) {
    font-size: 14px;
    padding: 1em 0;
    gap: 1em;
  }
}

.projects {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 1.25em;

  @include responsive(mobile) {
    gap: 0.75em;

    :deep(.project-item) {
      width: calc(50% - 0.375em);
    }
  }
}
</style>
