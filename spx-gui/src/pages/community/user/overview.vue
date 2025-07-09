<script setup lang="ts">
import { computed } from 'vue'
import { getUserPageRoute } from '@/router'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { Visibility, listProject, ownerAll } from '@/apis/project'
import { useUser, useUserStore } from '@/stores/user'
import { useResponsive } from '@/components/ui'
import CommunityCard from '@/components/community/CommunityCard.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'
import MyProjectsEmpty from '@/components/community/MyProjectsEmpty.vue'

const props = defineProps<{
  name: string
}>()

const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => (isDesktopLarge.value ? 5 : 4))
const userStore = useUserStore()
const isSignedInUser = computed(() => props.name === userStore.getSignedInUser()?.name)

const { data: user } = useUser(() => props.name)
usePageTitle(() => {
  if (user.value == null) return null
  return {
    en: `User ${user.value.displayName}`,
    zh: `用户 ${user.value.displayName}`
  }
})

const projectsRoute = computed(() => {
  const projectsNum = projectsRet.data.value?.length ?? 0
  if (projectsNum === 0) return null
  return getUserPageRoute(props.name, 'projects')
})

const projectsRet = useQuery(
  async () => {
    const { data: projects } = await listProject({
      owner: props.name,
      pageIndex: 1,
      pageSize: numInRow.value,
      orderBy: 'updatedAt',
      sortOrder: 'desc'
    })
    return projects
  },
  { en: 'Failed to load projects', zh: '加载失败' }
)

const likesRoute = computed(() => {
  return getUserPageRoute(props.name, 'likes')
})

const likesRet = useQuery(
  async () => {
    const { data: likes } = await listProject({
      visibility: Visibility.Public,
      owner: ownerAll,
      liker: props.name,
      orderBy: 'likedAt',
      sortOrder: 'desc',
      pageIndex: 1,
      pageSize: numInRow.value
    })
    return likes
  },
  { en: 'Failed to load likes', zh: '加载失败' }
)
</script>

<template>
  <div class="user-overview">
    <CommunityCard class="card">
      <ProjectsSection
        v-radar="{ name: 'User projects', desc: 'Section showing user\'s projects' }"
        context="user"
        :num-in-row="numInRow"
        :query-ret="projectsRet"
        :link-to="projectsRoute"
      >
        <template #title>
          {{
            $t({
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
        <template v-if="isSignedInUser" #empty="emptyProps">
          <MyProjectsEmpty :style="emptyProps.style" />
        </template>
        <ProjectItem
          v-for="project in projectsRet.data.value"
          :key="project.id"
          context="mine"
          :project="project"
          @removed="projectsRet.refetch()"
        />
      </ProjectsSection>
    </CommunityCard>
    <CommunityCard class="card">
      <ProjectsSection
        v-radar="{ name: 'User liked projects', desc: 'Section showing projects liked by this user' }"
        context="user"
        :num-in-row="numInRow"
        :query-ret="likesRet"
        :link-to="likesRoute"
      >
        <template #title>
          {{
            $t({
              en: 'Projects I like',
              zh: '我喜欢的项目'
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
        <ProjectItem v-for="project in likesRet.data.value" :key="project.id" :project="project" />
      </ProjectsSection>
    </CommunityCard>
  </div>
</template>

<style lang="scss" scoped>
.user-overview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  padding: 0 var(--ui-gap-middle);
}
</style>
