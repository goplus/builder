<script setup lang="ts">
import { computed } from 'vue'
import { getUserPageRoute } from '@/router'
import { useQuery } from '@/utils/exception'
import { listProject } from '@/apis/project'
import { useUserStore } from '@/stores'
import CommunityCard from '@/components/community/CommunityCard.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'

const props = defineProps<{
  name: string
}>()

const isCurrentUser = computed(() => props.name === useUserStore().userInfo?.name)

const numInRow = 4 // at most 4 projects in a row, depending on the screen width

const projectsRoute = computed(() => {
  return getUserPageRoute(props.name, 'projects')
})

const projectsRet = useQuery(
  async () => {
    const { data: projects } = await listProject({
      owner: props.name,
      pageIndex: 1,
      pageSize: numInRow,
      orderBy: 'uTime',
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
      // TODO: check order here
      liker: props.name,
      pageIndex: 1,
      pageSize: numInRow
    })
    return likes
  },
  { en: 'Failed to load likes', zh: '加载失败' }
)
</script>

<template>
  <div class="user-overview">
    <CommunityCard class="card">
      <ProjectsSection context="user" :query-ret="projectsRet" :link-to="projectsRoute">
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
        <ProjectItem
          v-for="project in projectsRet.data.value"
          :key="project.id"
          :context="isCurrentUser ? 'mine' : 'public'"
          :project="project"
        />
      </ProjectsSection>
    </CommunityCard>
    <CommunityCard class="card">
      <ProjectsSection context="user" :query-ret="likesRet" :link-to="likesRoute">
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
  padding: 0 20px;
}
</style>
