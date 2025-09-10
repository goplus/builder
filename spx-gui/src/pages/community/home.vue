<template>
  <CenteredWrapper class="home-page">
    <GuestBanner v-if="!isSignedIn()" class="guest-banner" />
    <ProjectsSection
      v-else
      v-radar="{ name: 'Your projects', desc: 'Section showing user\'s own projects' }"
      context="home"
      :num-in-row="numInRow"
      :link-to="isSignedIn() ? myProjectsRoute : null"
      :query-ret="myProjects"
    >
      <template #title>
        {{
          $t({
            en: 'Your projects',
            zh: '你的项目'
          })
        }}
      </template>
      <template #link>
        {{
          $t({
            en: 'View all',
            zh: '查看所有'
          })
        }}
      </template>
      <template #empty="emptyProps">
        <MyProjectsEmpty :style="emptyProps.style" />
      </template>
      <ProjectItem
        v-for="project in myProjects.data.value"
        :key="project.id"
        context="mine"
        :project="project"
        @removed="myProjects.refetch()"
      />
    </ProjectsSection>
    <ProjectsSection
      v-radar="{ name: 'Community liking', desc: 'Section showing projects liked by the community' }"
      :link-to="communityLikingRoute"
      context="home"
      :num-in-row="numInRow"
      :query-ret="communityLikingProjects"
    >
      <template #title>
        {{
          $t({
            en: 'The community is liking',
            zh: '大家喜欢的'
          })
        }}
      </template>
      <template #link>
        {{
          $t({
            en: 'View more',
            zh: '查看更多'
          })
        }}
      </template>
      <ProjectItem v-for="project in communityLikingProjects.data.value" :key="project.id" :project="project" />
    </ProjectsSection>
    <ProjectsSection
      v-radar="{ name: 'Community remixing', desc: 'Section showing projects being remixed by the community' }"
      :link-to="communityRemixingRoute"
      context="home"
      :num-in-row="numInRow"
      :query-ret="communityRemixingProjects"
    >
      <template #title>
        {{
          $t({
            en: 'The community is remixing',
            zh: '大家在改编'
          })
        }}
      </template>
      <template #link>
        {{
          $t({
            en: 'View more',
            zh: '查看更多'
          })
        }}
      </template>
      <ProjectItem v-for="project in communityRemixingProjects.data.value" :key="project.id" :project="project" />
    </ProjectsSection>
    <ProjectsSection
      v-if="isSignedIn()"
      v-radar="{ name: 'Following created', desc: 'Section showing projects created by users you follow' }"
      context="home"
      :num-in-row="numInRow"
      :link-to="followingCreatedRoute"
      :query-ret="followingCreatedProjects"
    >
      <template #title>
        {{
          $t({
            en: 'Users you follow are creating',
            zh: '你关注的用户在创作'
          })
        }}
      </template>
      <template #link>
        {{
          $t({
            en: 'View more',
            zh: '查看更多'
          })
        }}
      </template>
      <ProjectItem v-for="project in followingCreatedProjects.data.value" :key="project.id" :project="project" />
    </ProjectsSection>
  </CenteredWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { ExploreOrder, exploreProjects, listProject } from '@/apis/project'
import { getExploreRoute, getUserPageRoute } from '@/router'
import { isSignedIn, getSignedInUsername } from '@/stores/user'
import { useResponsive } from '@/components/ui'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'
import MyProjectsEmpty from '@/components/community/MyProjectsEmpty.vue'
import GuestBanner from '@/components/community/home/banner/GuestBanner.vue'

usePageTitle([])

const isMobile = useResponsive('mobile')
const isTablet = useResponsive('tablet')
const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => {
  if (isMobile.value) return 2
  if (isTablet.value) return 3
  return isDesktopLarge.value ? 5 : 4
})

const signedInUsername = computed(() => getSignedInUsername())

const myProjectsRoute = computed(() => {
  if (signedInUsername.value == null) return ''
  return getUserPageRoute(signedInUsername.value, 'projects')
})

const myProjects = useQuery(
  async () => {
    if (signedInUsername.value == null) return []
    const { data: projects } = await listProject({
      pageIndex: 1,
      pageSize: numInRow.value,
      orderBy: 'updatedAt',
      sortOrder: 'desc'
    })
    return projects
  },
  { en: 'Failed to load projects', zh: '加载失败' }
)

const communityLikingRoute = getExploreRoute(ExploreOrder.MostLikes)

const communityLikingProjects = useQuery(
  () => exploreProjects({ order: ExploreOrder.MostLikes, count: numInRow.value }),
  { en: 'Failed to load projects', zh: '加载失败' }
)

const communityRemixingRoute = getExploreRoute(ExploreOrder.MostRemixes)

const communityRemixingProjects = useQuery(
  () => exploreProjects({ order: ExploreOrder.MostRemixes, count: numInRow.value }),
  { en: 'Failed to load projects', zh: '加载失败' }
)

const followingCreatedRoute = computed(() => {
  if (signedInUsername.value == null) return ''
  return getExploreRoute(ExploreOrder.FollowingCreated)
})

const followingCreatedProjects = useQuery(
  async () => {
    if (signedInUsername.value == null) return []
    return exploreProjects({ order: ExploreOrder.FollowingCreated, count: numInRow.value })
  },
  { en: 'Failed to load projects', zh: '加载失败' }
)
</script>

<style lang="scss" scoped>
.home-page {
  margin-top: 20px;
}

.guest-banner {
  margin: 12px 0 32px;
}
</style>
