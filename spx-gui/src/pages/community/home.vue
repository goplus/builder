<template>
  <CenteredWrapper class="main">
    <ProjectsSection
      v-if="userStore.isSignedIn"
      context="home"
      :link-to="myProjectsRoute"
      :query-ret="myProjects"
    >
      <template #title>
        {{
          $t({
            // TODO: "my" or "your"? (consistency)
            en: 'My projects',
            zh: '我的项目'
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
      <ProjectItem
        v-for="project in myProjects.data.value"
        :key="project.id"
        context="mine"
        :project="project"
      />
    </ProjectsSection>
    <ProjectsSection
      :link-to="communityLikingRoute"
      context="home"
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
      <ProjectItem
        v-for="project in communityLikingProjects.data.value"
        :key="project.id"
        :project="project"
      />
    </ProjectsSection>
    <ProjectsSection
      :link-to="communityRemixingRoute"
      context="home"
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
      <ProjectItem
        v-for="project in communityRemixingProjects.data.value"
        :key="project.id"
        :project="project"
      />
    </ProjectsSection>
    <ProjectsSection
      v-if="userStore.isSignedIn"
      context="home"
      :link-to="followingCreatedRoute"
      :query-ret="followingCreatedProjects"
    >
      <template #title>
        {{
          $t({
            en: 'Users I follow are creating',
            zh: '我关注的人在创作'
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
      <ProjectItem
        v-for="project in followingCreatedProjects.data.value"
        :key="project.id"
        :project="project"
      />
    </ProjectsSection>
  </CenteredWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@/utils/exception'
import { ExploreOrder, exploreProjects, listProject } from '@/apis/project'
import { getExploreRoute, getUserPageRoute } from '@/router'
import { useUserStore } from '@/stores'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'

const numInRow = 5 // at most 5 projects in a row, depending on the screen width

const userStore = useUserStore()

const myProjectsRoute = computed(() => {
  if (userStore.userInfo == null) return ''
  return getUserPageRoute(userStore.userInfo.name, 'projects')
})

const myProjects = useQuery(
  async () => {
    if (userStore.userInfo == null) return []
    const { data: projects } = await listProject({
      pageIndex: 1,
      pageSize: numInRow,
      orderBy: 'updatedAt',
      sortOrder: 'desc'
    })
    return projects
  },
  { en: 'Failed to load projects', zh: '加载失败' }
)

const communityLikingRoute = getExploreRoute(ExploreOrder.MostLikes)

const communityLikingProjects = useQuery(
  () => exploreProjects({ order: ExploreOrder.MostLikes, count: numInRow }),
  { en: 'Failed to load projects', zh: '加载失败' }
)

const communityRemixingRoute = getExploreRoute(ExploreOrder.MostRemixes)

const communityRemixingProjects = useQuery(
  () => exploreProjects({ order: ExploreOrder.MostRemixes, count: numInRow }),
  { en: 'Failed to load projects', zh: '加载失败' }
)

const followingCreatedRoute = computed(() => {
  if (userStore.userInfo == null) return ''
  return getExploreRoute(ExploreOrder.FollowingCreated)
})

const followingCreatedProjects = useQuery(
  async () => {
    if (userStore.userInfo == null) return []
    return exploreProjects({ order: ExploreOrder.FollowingCreated, count: numInRow })
  },
  { en: 'Failed to load projects', zh: '加载失败' }
)
</script>

<style lang="scss" scoped>
.main {
  margin-top: 8px;
}
</style>
