<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageHandle, useQuery } from '@/utils/exception'
import { humanizeCount, humanizeExactCount, untilNotNull, useAsyncComputed } from '@/utils/utils'
import { getCleanupSignal } from '@/utils/disposable'
import { useEnsureSignedIn } from '@/utils/user'
import {
  isLiking,
  likeProject,
  ownerAll,
  recordProjectView,
  stringifyRemixSource,
  unlikeProject,
  Visibility
} from '@/apis/project'
import { listProject } from '@/apis/project'
import { Project } from '@/models/project'
import { useUserStore } from '@/stores'
import { getProjectEditorRoute, getUserPageRoute } from '@/router'
import {
  UIIcon,
  UILoading,
  UIError,
  UIButton,
  UIDropdown,
  UIMenu,
  UIMenuItem,
  UICollapse,
  UICollapseItem,
  UIDivider,
  useResponsive
} from '@/components/ui'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'
import RemixedFrom from '@/components/community/project/RemixedFrom.vue'
import OwnerInfo from '@/components/community/project/OwnerInfo.vue'
import {
  useCreateProject,
  usePublishProject,
  useRemoveProject,
  useShareProject,
  useUnpublishProject
} from '@/components/project'
import CommunityCard from '@/components/community/CommunityCard.vue'
import ReleaseHistory from '@/components/community/project/ReleaseHistory.vue'

const props = defineProps<{
  owner: string
  name: string
}>()

const router = useRouter()
const userStore = useUserStore()

const {
  data: project,
  isLoading,
  error,
  refetch: reloadProject
} = useQuery(
  async (onCleanup) => {
    const signal = getCleanupSignal(onCleanup)
    const p = new Project()
    ;(window as any).project = p // for debug purpose, TODO: remove me
    const loaded = await p.loadFromCloud(props.owner, props.name, signal)
    return loaded
  },
  {
    en: 'Failed to load project',
    zh: '加载项目失败'
  }
)

watch(
  () => [props.owner, props.name],
  () => userStore.isSignedIn() && recordProjectView(props.owner, props.name),
  { immediate: true }
)

const runnerState = ref<'initial' | 'running'>('initial')
watch(
  () => [props.owner, props.name],
  () => {
    runnerState.value = 'initial'
  }
)

const isOwner = computed(() => props.owner === userStore.userInfo()?.name)
const liking = useAsyncComputed(() => {
  if (!userStore.isSignedIn()) return Promise.resolve(false)
  else return isLiking(props.owner, props.name)
})

const projectRunnerRef = ref<InstanceType<typeof ProjectRunner> | null>(null)

const likeCount = computed(() => {
  if (project.value == null) return null
  const count = humanizeExactCount(project.value.likeCount)
  return {
    title: {
      en: `Liked by ${count.en} users`,
      zh: `${count.zh} 个用户喜欢`
    },
    text: humanizeCount(project.value.likeCount)
  }
})

const viewCount = computed(() => {
  if (project.value == null) return null
  const count = humanizeCount(project.value.viewCount)
  return {
    title: {
      en: `Viewed ${count.en} times`,
      zh: `被查看 ${count.zh} 次`
    },
    text: count
  }
})

const remixCount = computed(() => {
  if (project.value == null) return null
  const count = humanizeCount(project.value.remixCount)
  return {
    title: {
      en: `Remixed ${count.en} times`,
      zh: `被改编 ${count.zh} 次`
    },
    text: count
  }
})

const ensureSignedIn = useEnsureSignedIn()

const handleRun = useMessageHandle(
  async () => {
    await projectRunnerRef.value?.run()
    runnerState.value = 'running'
  },
  { en: 'Failed to run project', zh: '运行项目失败' }
)

const handleRerun = useMessageHandle(async () => projectRunnerRef.value?.rerun(), {
  en: 'Failed to rerun project',
  zh: '重新运行项目失败'
})

const handleEdit = useMessageHandle(
  async () => {
    const projectEditorRoute = getProjectEditorRoute(props.name)
    await router.push(projectEditorRoute)
  },
  { en: 'Failed to open editor', zh: '打开编辑器失败' }
)

const handleLike = useMessageHandle(
  async () => {
    await ensureSignedIn()
    await likeProject(props.owner, props.name)
    await project.value?.loadFromCloud(props.owner, props.name)
    liking.value = true
  },
  { en: 'Failed to like', zh: '标记喜欢失败' }
)

const handleUnlike = useMessageHandle(
  async () => {
    await ensureSignedIn()
    await unlikeProject(props.owner, props.name)
    await project.value?.loadFromCloud(props.owner, props.name)
    liking.value = false
  },
  { en: 'Failed to unlike', zh: '取消喜欢失败' }
)

const isTogglingLike = computed(() =>
  liking.value ? handleUnlike.isLoading.value : handleLike.isLoading.value
)

function handleToggleLike() {
  return (liking.value ? handleUnlike.fn : handleLike.fn)()
}

const shareProject = useShareProject()

const handleShare = useMessageHandle(() => shareProject(props.owner, props.name), {
  en: 'Failed to share project',
  zh: '分享项目失败'
})

const createProject = useCreateProject()

const handleRemix = useMessageHandle(
  async () => {
    await ensureSignedIn()
    const { name } = await createProject(stringifyRemixSource(props.owner, props.name))
    router.push(getProjectEditorRoute(name))
  },
  { en: 'Failed to remix project', zh: '改编项目失败' }
)

const releaseHistoryRef = ref<InstanceType<typeof ReleaseHistory>>()

const unpublishProject = useUnpublishProject()
const handleUnpublish = useMessageHandle(
  async () => {
    const p = await untilNotNull(project)
    await unpublishProject(p)
    releaseHistoryRef.value?.refetch()
  },
  { en: 'Failed to unpublish project', zh: '取消发布项目失败' },
  {
    en: 'Project unpublished',
    zh: '已取消发布'
  }
)

const publishProject = usePublishProject()
const handlePublish = useMessageHandle(
  async () => {
    const p = await untilNotNull(project)
    await publishProject(p)
    releaseHistoryRef.value?.refetch()
  },
  { en: 'Failed to publish project', zh: '发布项目失败' }
)

const removeProject = useRemoveProject()
const handleRemove = useMessageHandle(
  async () => {
    await removeProject(props.owner, props.name)
    await router.push(getUserPageRoute(userStore.userInfo()!.name, 'projects'))
  },
  { en: 'Failed to remove project', zh: '删除项目失败' },
  { en: 'Project removed', zh: '项目已删除' }
)

const isDesktopLarge = useResponsive('desktop-large')
const remixNumInRow = computed(() => (isDesktopLarge.value ? 6 : 5))

const remixesRet = useQuery(
  async () => {
    const { data: projects } = await listProject({
      visibility: Visibility.Public,
      owner: ownerAll,
      remixedFrom: `${props.owner}/${props.name}`,
      pageIndex: 1,
      pageSize: remixNumInRow.value,
      orderBy: 'likeCount',
      sortOrder: 'desc'
    })
    return projects
  },
  { en: 'Failed to load projects', zh: '加载失败' }
)
</script>

<template>
  <CenteredWrapper size="large">
    <UIError v-if="error != null" :retry="reloadProject">
      {{ $t(error.userMessage) }}
    </UIError>
    <template v-else>
      <CommunityCard class="main">
        <UILoading v-if="isLoading" cover mask="solid" />
        <div class="left">
          <div class="project-wrapper">
            <template v-if="project != null">
              <ProjectRunner ref="projectRunnerRef" :project="project" />
              <div v-show="runnerState === 'initial'" class="runner-mask">
                <UIButton
                  class="run-button"
                  type="primary"
                  size="large"
                  icon="play"
                  :disabled="projectRunnerRef == null"
                  :loading="handleRun.isLoading.value"
                  @click="handleRun.fn"
                  >{{ $t({ en: 'Run', zh: '运行' }) }}</UIButton
                >
              </div>
            </template>
          </div>
          <div class="ops">
            <UIButton
              v-if="runnerState === 'initial'"
              type="primary"
              icon="play"
              :disabled="projectRunnerRef == null"
              :loading="handleRun.isLoading.value"
              @click="handleRun.fn"
            >
              {{ $t({ en: 'Run', zh: '运行' }) }}
            </UIButton>
            <UIButton
              v-if="runnerState === 'running'"
              type="primary"
              icon="rotate"
              :disabled="projectRunnerRef == null"
              :loading="handleRerun.isLoading.value"
              @click="handleRerun.fn"
            >
              {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
            </UIButton>
            <UIButton type="boring" icon="share" @click="handleShare.fn">
              {{ $t({ en: 'Share', zh: '分享' }) }}
            </UIButton>
          </div>
        </div>
        <div class="right">
          <template v-if="project != null">
            <h2 class="title">{{ project.name }}</h2>
            <RemixedFrom
              v-if="project.remixedFrom != null"
              class="remixed-from"
              :remixed-from="project.remixedFrom"
            />
            <div class="info">
              <OwnerInfo :owner="project.owner!" />
              <p class="extra">
                <template v-if="isOwner">
                  <span class="part" :title="$t(likeCount!.title)">
                    <UIIcon type="heart" />
                    {{ $t(likeCount!.text) }}
                  </span>
                  <i class="sep"></i>
                </template>
                <span class="part" :title="$t(viewCount!.title)">
                  <UIIcon type="eye" />
                  {{ $t(viewCount!.text) }}
                </span>
                <i class="sep"></i>
                <span class="part" :title="$t(remixCount!.title)">
                  <UIIcon type="remix" />
                  {{ $t(remixCount!.text) }}
                </span>
              </p>
            </div>
            <div class="ops">
              <template v-if="isOwner">
                <UIButton
                  type="primary"
                  size="large"
                  icon="edit2"
                  :loading="handleEdit.isLoading.value"
                  @click="handleEdit.fn"
                  >{{ $t({ en: 'Edit', zh: '编辑' }) }}</UIButton
                >
                <UIButton
                  v-if="project.visibility === Visibility.Public"
                  type="boring"
                  size="large"
                  icon="share"
                  @click="handleShare.fn"
                  >{{ $t({ en: 'Share', zh: '分享' }) }}</UIButton
                >
                <UIButton
                  v-else
                  type="boring"
                  size="large"
                  icon="share"
                  @click="handlePublish.fn"
                  >{{ $t({ en: 'Publish', zh: '发布' }) }}</UIButton
                >
                <UIDropdown placement="bottom-end" trigger="click">
                  <template #trigger>
                    <UIButton class="more" type="boring" size="large" icon="more"></UIButton>
                  </template>
                  <UIMenu>
                    <UIMenuItem
                      v-if="project.visibility === Visibility.Public"
                      @click="handleUnpublish.fn"
                      >{{ $t({ en: 'Unpublish', zh: '取消发布' }) }}</UIMenuItem
                    >
                    <UIMenuItem @click="handleRemove.fn">{{
                      $t({ en: 'Remove', zh: '删除' })
                    }}</UIMenuItem>
                  </UIMenu>
                </UIDropdown>
              </template>
              <template v-else>
                <UIButton
                  type="primary"
                  size="large"
                  icon="remix"
                  :loading="handleRemix.isLoading.value"
                  @click="handleRemix.fn"
                  >{{ $t({ en: 'Remix', zh: '改编' }) }}</UIButton
                >
                <UIButton
                  :class="{ liking }"
                  type="boring"
                  size="large"
                  :title="$t(likeCount!.title)"
                  :icon="liking ? 'heart' : 'heartHollow'"
                  :loading="isTogglingLike"
                  @click="handleToggleLike"
                >
                  {{ $t(likeCount!.text) }}
                </UIButton>
                <UIButton type="boring" size="large" icon="share" @click="handleShare.fn">{{
                  $t({ en: 'Share', zh: '分享' })
                }}</UIButton>
              </template>
            </div>
            <UIDivider class="divider" />
            <UICollapse
              class="collapse"
              :default-expanded-names="['description', 'instructions', 'releases']"
            >
              <UICollapseItem :title="$t({ en: 'Description', zh: '描述' })" name="description">
                {{ project.description || $t({ en: 'No description yet', zh: '暂无描述' }) }}
              </UICollapseItem>
              <UICollapseItem
                :title="$t({ en: 'Play instructions', zh: '操作说明' })"
                name="instructions"
              >
                {{ project.instructions || $t({ en: 'No instructions yet', zh: '暂无操作说明' }) }}
              </UICollapseItem>
              <UICollapseItem
                :title="$t({ en: 'Release history', zh: '发布历史' })"
                name="releases"
              >
                <ReleaseHistory ref="releaseHistoryRef" :owner="props.owner" :name="props.name" />
              </UICollapseItem>
            </UICollapse>
          </template>
        </div>
      </CommunityCard>
      <ProjectsSection
        class="remixes"
        context="project"
        :num-in-row="remixNumInRow"
        :query-ret="remixesRet"
      >
        <template #title>
          {{
            $t({
              en: 'Popular remixes',
              zh: '热门改编'
            })
          }}
        </template>
        <ProjectItem v-for="remix in remixesRet.data.value" :key="remix.id" :project="remix" />
      </ProjectsSection>
    </template>
  </CenteredWrapper>
</template>

<style scoped lang="scss">
.main {
  position: relative;
  flex: 0 0 auto;
  margin-top: 24px;
  padding: 20px;
  display: flex;
  gap: 40px;
  background: var(--ui-color-grey-100);
}

.left {
  flex: 1 1 744px;
  .project-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: var(--ui-border-radius-1);
    overflow: hidden;

    .runner-mask {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: var(--ui-border-radius-1);
      background: rgba(87, 96, 106, 0.2);
      backdrop-filter: blur(5px);
    }

    .run-button {
      width: 160px;
    }
  }

  .ops {
    margin-top: 12px;
    display: flex;
    gap: var(--ui-gap-middle);
    justify-content: flex-end;
  }
}

.right {
  flex: 1 1 456px;
  padding-right: 20px;
  display: flex;
  flex-direction: column;

  .title {
    font-size: 20px;
    line-height: 1.4;
    color: var(--ui-color-title);
  }

  .remixed-from {
    margin-top: 8px;
  }

  .info {
    margin-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .extra {
      display: flex;
      align-items: center;
      gap: 8px;

      .part {
        display: flex;
        gap: 4px;
        align-items: center;
        color: var(--ui-color-hint-2);
      }

      .sep {
        width: 1px;
        height: 12px;
        background-color: var(--ui-color-dividing-line-1);
      }
    }
  }

  .ops {
    margin-top: 16px;
    display: flex;
    gap: 12px;

    & > * {
      flex: 1 1 0;

      &.more {
        flex: 0 0 auto;
        width: 40px;
        :deep(.content) {
          padding: 0;
        }
      }
    }

    .liking :deep(.content) {
      color: var(--ui-color-red-main);
    }
  }

  .divider {
    margin: 24px 0 16px;
  }

  .collapse {
    flex: 1 1 0;
    overflow-y: auto;
  }
}

.remixes {
  margin-top: 20px;
}
</style>
