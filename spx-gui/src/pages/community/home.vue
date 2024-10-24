<template>
  <CenteredWrapper class="main">
    <ProjectsSection
      context="home"
      :num-in-row="numInRow"
      :link-to="userStore.isSignedIn() ? myProjectsRoute : null"
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
        <div v-if="!userStore.isSignedIn()" class="join-placeholder" :style="emptyProps.style">
          <h4 class="title">
            <!-- TODO: design here not finished yet -->
            <UILink @click="handleJoin">
              {{ $t({ en: 'Join Go+ Builder', zh: '加入 Go+ Builder' }) }}
            </UILink>
            {{
              $t({
                en: 'to create',
                zh: '一起创作'
              })
            }}
          </h4>
        </div>
        <UIEmpty v-else size="extra-large" :style="emptyProps.style">
          {{
            $t({
              en: 'You have not created any projects yet',
              zh: '你还没有创建任何项目'
            })
          }}
          <template #op>
            <UIButton type="boring" size="large" @click="handleNewProject">
              <template #icon>
                <img :src="newProjectIcon" />
              </template>
              {{ $t({ en: 'New project', zh: '新建项目' }) }}
            </UIButton>
          </template>
        </UIEmpty>
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
      <ProjectItem
        v-for="project in communityLikingProjects.data.value"
        :key="project.id"
        :project="project"
      />
    </ProjectsSection>
    <ProjectsSection
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
      <ProjectItem
        v-for="project in communityRemixingProjects.data.value"
        :key="project.id"
        :project="project"
      />
    </ProjectsSection>
    <ProjectsSection
      v-if="userStore.isSignedIn()"
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
import { useRouter } from 'vue-router'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { usePageTitle } from '@/utils/utils'
import { ExploreOrder, exploreProjects, listProject } from '@/apis/project'
import { getExploreRoute, getProjectEditorRoute, getUserPageRoute } from '@/router'
import { useUserStore } from '@/stores/user'
import { useResponsive, UILink, UIEmpty, UIButton } from '@/components/ui'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import { useCreateProject } from '@/components/project'
import ProjectItem from '@/components/project/ProjectItem.vue'
import newProjectIcon from '@/components/navbar/icons/new.svg'

usePageTitle([])

const isDesktopLarge = useResponsive('desktop-large')
const numInRow = computed(() => (isDesktopLarge.value ? 5 : 4))

const userStore = useUserStore()
const signedInUser = computed(() => userStore.getSignedInUser())

function handleJoin() {
  userStore.initiateSignIn()
}

const router = useRouter()
const createProject = useCreateProject()
const handleNewProject = useMessageHandle(
  async () => {
    const { name } = await createProject()
    router.push(getProjectEditorRoute(name))
  },
  { en: 'Failed to create new project', zh: '新建项目失败' }
).fn

const myProjectsRoute = computed(() => {
  if (signedInUser.value == null) return ''
  return getUserPageRoute(signedInUser.value.name, 'projects')
})

const myProjects = useQuery(
  async () => {
    if (signedInUser.value == null) return []
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
  if (signedInUser.value == null) return ''
  return getExploreRoute(ExploreOrder.FollowingCreated)
})

const followingCreatedProjects = useQuery(
  async () => {
    if (signedInUser.value == null) return []
    return exploreProjects({ order: ExploreOrder.FollowingCreated, count: numInRow.value })
  },
  { en: 'Failed to load projects', zh: '加载失败' }
)
</script>

<style lang="scss" scoped>
.main {
  margin-top: 8px;
}

.join-placeholder {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--ui-color-grey-100);
  border-radius: var(--ui-border-radius-2);

  .title {
    font-size: 16px;
    line-height: 26px;
    color: var(--ui-color-grey-1000);
  }
}
</style>
