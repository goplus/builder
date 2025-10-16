<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { useIsLikingProject, useLikeProject, useUnlikeProject } from '@/stores/liking'
import { humanizeCount, humanizeExactCount, untilNotNull } from '@/utils/utils'
import { useEnsureSignedIn } from '@/utils/user'
import { isSignInRequiredForProject } from '@/utils/project'
import { usePageTitle } from '@/utils/utils'
import { ownerAll, recordProjectView, stringifyProjectFullName, stringifyRemixSource, Visibility } from '@/apis/project'
import { listProject } from '@/apis/project'
import { listReleases } from '@/apis/project-release'
import { Project } from '@/models/project'
import { useUser, isSignedIn, getSignedInUsername, initiateSignIn } from '@/stores/user'
import { getOwnProjectEditorRoute, getProjectEditorRoute, getUserPageRoute } from '@/router'
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
  useResponsive,
  UITooltip
} from '@/components/ui'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import ProjectItem from '@/components/project/ProjectItem.vue'
import ProjectRunnerSurface from '@/components/project/runner/ProjectRunnerSurface.vue'
import RemixedFrom from '@/components/community/project/RemixedFrom.vue'
import OwnerInfo from '@/components/community/project/OwnerInfo.vue'
import { useCreateProject, useRemoveProject, useShareProject, useUnpublishProject } from '@/components/project'
import CommunityCard from '@/components/community/CommunityCard.vue'
import ReleaseHistory from '@/components/community/project/ReleaseHistory.vue'
import TextView from '@/components/community/TextView.vue'
import kikoWaveSvg from './kiko-wave.svg'

const props = defineProps<{
  owner: string
  name: string
}>()

const router = useRouter()

const {
  data: project,
  isLoading,
  error,
  refetch: reloadProject
} = useQuery(
  async (ctx) => {
    const p = new Project()
    ;(window as any).project = p // for debug purpose, TODO: remove me
    const loaded = await p.loadFromCloud(props.owner, props.name, true, ctx.signal)
    return loaded
  },
  {
    en: 'Failed to load project',
    zh: '加载项目失败'
  }
)

const { data: ownerInfo } = useUser(() => props.owner)

usePageTitle(() => {
  if (ownerInfo.value == null) return null
  return [
    {
      en: props.name,
      zh: props.name
    },
    {
      en: ownerInfo.value.displayName,
      zh: ownerInfo.value.displayName
    }
  ]
})

watch(
  () => [props.owner, props.name],
  () => isSignedIn() && recordProjectView(props.owner, props.name),
  { immediate: true }
)

const runnerState = ref<'initial' | 'loading' | 'running'>('initial')
watch(
  () => [props.owner, props.name],
  () => {
    runnerState.value = 'initial'
  }
)

const isOwner = computed(() => props.owner === getSignedInUsername())
const { data: liking } = useIsLikingProject(() => ({ owner: props.owner, name: props.name }))

const projectRunnerRef = ref<InstanceType<typeof ProjectRunnerSurface> | null>(null)
const isFullScreenRunning = ref(false)

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

const needsSignInToRun = computed(
  () => !isSignedIn() && project.value != null && isSignInRequiredForProject(project.value)
)

function handleSignIn() {
  initiateSignIn()
}

const handleRun = useMessageHandle(
  async () => {
    runnerState.value = 'loading'
    try {
      await projectRunnerRef.value?.run()
      runnerState.value = 'running'
    } catch (err) {
      runnerState.value = 'initial'
      throw err
    }
  },
  { en: 'Failed to run project', zh: '运行项目失败' }
)

const handleStop = useMessageHandle(
  async () => {
    await projectRunnerRef.value?.stop()
    runnerState.value = 'initial'
  },
  { en: 'Failed to stop project', zh: '停止项目失败' }
)

const handleRerun = useMessageHandle(
  async () => {
    runnerState.value = 'loading'
    try {
      await projectRunnerRef.value?.rerun()
      runnerState.value = 'running'
    } catch (err) {
      runnerState.value = 'initial'
      throw err
    }
  },
  {
    en: 'Failed to rerun project',
    zh: '重新运行项目失败'
  }
)

const handleEdit = useMessageHandle(
  async () => {
    const projectEditorRoute = getProjectEditorRoute(props.owner, props.name)
    await router.push(projectEditorRoute)
  },
  { en: 'Failed to open editor', zh: '打开编辑器失败' }
)

const likeProject = useLikeProject()
const handleLike = useMessageHandle(
  async () => {
    await ensureSignedIn()
    await likeProject(props.owner, props.name)
    await project.value?.loadFromCloud(props.owner, props.name, true) // refresh project info (likeCount)
  },
  { en: 'Failed to like', zh: '标记喜欢失败' }
)

const unlikeProject = useUnlikeProject()
const handleUnlike = useMessageHandle(
  async () => {
    await ensureSignedIn()
    await unlikeProject(props.owner, props.name)
    await project.value?.loadFromCloud(props.owner, props.name, true) // refresh project info (likeCount)
  },
  { en: 'Failed to unlike', zh: '取消喜欢失败' }
)

const isTogglingLike = computed(() => (liking.value ? handleUnlike.isLoading.value : handleLike.isLoading.value))

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
    const name = await createProject(stringifyRemixSource(props.owner, props.name))
    router.push(getOwnProjectEditorRoute(name))
  },
  { en: 'Failed to remix project', zh: '改编项目失败' }
)

const releasesRet = useQuery(
  async () => {
    const { owner, name } = props
    const { data } = await listReleases({
      projectFullName: stringifyProjectFullName(owner, name),
      orderBy: 'createdAt',
      sortOrder: 'desc',
      pageIndex: 1,
      pageSize: 10 // load at most 10 recent releases
    })
    return data
  },
  { en: 'Load release history failed', zh: '加载发布历史失败' }
)

const hasRelease = computed(() => releasesRet.data.value != null && releasesRet.data.value?.length > 0)

const unpublishProject = useUnpublishProject()
const handleUnpublish = useMessageHandle(
  async () => {
    const p = await untilNotNull(project)
    await unpublishProject(p)
    releasesRet.refetch()
  },
  { en: 'Failed to unpublish project', zh: '取消发布项目失败' },
  {
    en: 'Project unpublished',
    zh: '已取消发布'
  }
)

const handlePublish = useMessageHandle(
  // there may be no thumbnail for some projects (see details in https://github.com/goplus/builder/issues/1025),
  // to ensure thumbnail for project-release, we jump to editor where we are able to generate thumbnails and then finish publishing
  async () => router.push(getOwnProjectEditorRoute(props.name, true)),
  { en: 'Failed to publish project', zh: '发布项目失败' }
)

const removeProject = useRemoveProject()
const handleRemove = useMessageHandle(
  async () => {
    await removeProject(props.owner, props.name)
    await router.push(getUserPageRoute(getSignedInUsername()!, 'projects'))
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
      remixedFrom: stringifyRemixSource(props.owner, props.name),
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
    <CommunityCard
      v-radar="{ name: 'Project content', desc: 'Main content area for project details and runner' }"
      class="main"
    >
      <UILoading v-if="isLoading" cover mask="solid" />
      <UIError v-else-if="error != null" class="error" :retry="reloadProject">
        {{ $t(error.userMessage) }}
      </UIError>
      <div class="left">
        <div class="project-wrapper">
          <template v-if="project != null">
            <ProjectRunnerSurface
              ref="projectRunnerRef"
              :key="`${project.owner}/${project.name}`"
              v-model:fullscreen="isFullScreenRunning"
              :project="project"
              :runner-state="runnerState"
              :run="handleRun.fn"
              :run-loading="handleRun.isLoading.value"
              :rerun="handleRerun.fn"
              :rerun-loading="handleRerun.isLoading.value"
              :stop="handleStop.fn"
              :stop-loading="handleStop.isLoading.value"
            >
              <template #inline-overlay>
                <Transition name="runner-mask-fade" appear>
                  <div
                    v-if="runnerState !== 'running'"
                    :class="['runner-mask', { initial: runnerState === 'initial' }]"
                  >
                    <template v-if="runnerState === 'initial'">
                      <div v-if="needsSignInToRun" class="sign-in-prompt">
                        <div class="sign-in-card">
                          <img :src="kikoWaveSvg" class="kiko-wave" alt="" />
                          <p class="message">
                            {{
                              $t({
                                en: 'This game requires sign-in before playing',
                                zh: '该游戏需要先登录后才能体验'
                              })
                            }}
                          </p>
                          <UIButton
                            v-radar="{ name: 'Sign-in button', desc: 'Click to sign in' }"
                            class="sign-in-button"
                            size="large"
                            type="primary"
                            @click="handleSignIn"
                          >
                            {{ $t({ en: 'Sign in', zh: '立即登录' }) }}
                          </UIButton>
                        </div>
                      </div>
                      <UIButton
                        v-else
                        v-radar="{ name: 'Run button', desc: 'Click to run the project' }"
                        type="primary"
                        size="large"
                        icon="playHollow"
                        :disabled="projectRunnerRef == null"
                        :loading="handleRun.isLoading.value"
                        @click="handleRun.fn"
                        >{{ $t({ en: 'Run', zh: '运行' }) }}</UIButton
                      >
                    </template>
                  </div>
                </Transition>
              </template>
            </ProjectRunnerSurface>
          </template>
        </div>
        <div class="ops">
          <UIButton
            v-if="runnerState === 'running' && !handleStop.isLoading.value"
            v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project' }"
            type="primary"
            icon="rotate"
            :disabled="projectRunnerRef == null || handleStop.isLoading.value"
            :loading="handleRerun.isLoading.value"
            @click="handleRerun.fn"
          >
            {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
          </UIButton>
          <UIButton
            v-if="runnerState === 'loading' || runnerState === 'running'"
            v-radar="{ name: 'Stop button', desc: 'Click to stop the project' }"
            type="boring"
            icon="end"
            :loading="handleStop.isLoading.value"
            @click="handleStop.fn"
          >
            {{ $t({ en: 'Stop', zh: '停止' }) }}
          </UIButton>
          <UITooltip v-if="runnerState === 'loading' || runnerState === 'running'">
            <template #trigger>
              <UIButton
                v-radar="{
                  name: 'Enter full screen button',
                  desc: 'Click to enter full screen for the running project'
                }"
                type="boring"
                icon="enterFullScreen"
                :disabled="handleStop.isLoading.value"
                @click="isFullScreenRunning = true"
              ></UIButton>
            </template>
            {{ $t({ en: 'Enter full screen', zh: '进入全屏' }) }}
          </UITooltip>
          <UITooltip>
            <template #trigger>
              <UIButton
                v-radar="{ name: 'Share button', desc: 'Click to share the project' }"
                type="boring"
                icon="share"
                @click="handleShare.fn"
              ></UIButton>
            </template>
            {{ $t({ en: 'Share', zh: '分享' }) }}
          </UITooltip>
        </div>
      </div>
      <div class="right">
        <template v-if="project != null">
          <h2 class="title">{{ project.name }}</h2>
          <RemixedFrom v-if="project.remixedFrom != null" class="remixed-from" :remixed-from="project.remixedFrom" />
          <div class="info">
            <OwnerInfo :owner="project.owner!" />
            <p class="extra">
              <span class="part" :title="$t(viewCount!.title)">
                <UIIcon class="icon" type="eye" />
                {{ $t(viewCount!.text) }}
              </span>
              <template v-if="isOwner">
                <i class="sep"></i>
                <span class="part" :title="$t(likeCount!.title)">
                  <UIIcon class="icon" type="heart" />
                  {{ $t(likeCount!.text) }}
                </span>
              </template>
              <i class="sep"></i>
              <span class="part" :title="$t(remixCount!.title)">
                <UIIcon class="icon" type="remix" />
                {{ $t(remixCount!.text) }}
              </span>
            </p>
          </div>
          <div class="ops">
            <template v-if="isOwner">
              <UIButton
                v-radar="{ name: 'Edit button', desc: 'Click to edit the project' }"
                type="primary"
                size="large"
                icon="edit2"
                :loading="handleEdit.isLoading.value"
                @click="handleEdit.fn"
                >{{ $t({ en: 'Edit', zh: '编辑' }) }}</UIButton
              >
              <UIButton
                v-if="project.visibility === Visibility.Public"
                v-radar="{ name: 'Share button', desc: 'Click to share the project' }"
                type="boring"
                size="large"
                icon="share"
                @click="handleShare.fn"
                >{{ $t({ en: 'Share', zh: '分享' }) }}</UIButton
              >
              <UIButton
                v-else
                v-radar="{ name: 'Publish button', desc: 'Click to publish the project' }"
                type="boring"
                size="large"
                icon="share"
                :loading="handlePublish.isLoading.value"
                @click="handlePublish.fn"
                >{{ $t({ en: 'Publish', zh: '发布' }) }}</UIButton
              >
              <UIDropdown placement="bottom-end" trigger="click">
                <template #trigger>
                  <UIButton
                    v-radar="{ name: 'More options button', desc: 'Click to see more project options' }"
                    class="more"
                    type="boring"
                    size="large"
                    icon="more"
                  ></UIButton>
                </template>
                <UIMenu>
                  <UIMenuItem
                    v-if="project.visibility === Visibility.Public"
                    v-radar="{ name: 'Unpublish option', desc: 'Click to unpublish the project' }"
                    @click="handleUnpublish.fn"
                    >{{ $t({ en: 'Unpublish', zh: '取消发布' }) }}</UIMenuItem
                  >
                  <UIMenuItem
                    v-radar="{ name: 'Remove option', desc: 'Click to remove the project' }"
                    @click="handleRemove.fn"
                    >{{ $t({ en: 'Remove', zh: '删除' }) }}</UIMenuItem
                  >
                </UIMenu>
              </UIDropdown>
            </template>
            <template v-else>
              <UIButton
                v-if="hasRelease"
                v-radar="{ name: 'Remix button', desc: 'Click to remix this project' }"
                type="primary"
                size="large"
                icon="remix"
                :loading="handleRemix.isLoading.value"
                @click="handleRemix.fn"
                >{{ $t({ en: 'Remix', zh: '改编' }) }}</UIButton
              >
              <UIButton
                v-radar="{ name: 'Like button', desc: 'Click to like or unlike the project' }"
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
              <UIButton
                v-radar="{ name: 'Share button', desc: 'Click to share the project' }"
                type="boring"
                size="large"
                icon="share"
                @click="handleShare.fn"
                >{{ $t({ en: 'Share', zh: '分享' }) }}</UIButton
              >
            </template>
          </div>
          <UIDivider class="divider" />
          <UICollapse
            v-radar="{
              name: 'Project details',
              desc: 'Collapsible sections showing project description, instructions and release history'
            }"
            class="collapse"
            :default-expanded-names="['description', 'instructions', 'releases']"
          >
            <UICollapseItem :title="$t({ en: 'Description', zh: '描述' })" name="description">
              <TextView :text="project.description" :placeholder="$t({ en: 'No description yet', zh: '暂无描述' })" />
            </UICollapseItem>
            <UICollapseItem :title="$t({ en: 'Play instructions', zh: '操作说明' })" name="instructions">
              <TextView
                :text="project.instructions"
                :placeholder="$t({ en: 'No instructions yet', zh: '暂无操作说明' })"
              />
            </UICollapseItem>
            <UICollapseItem :title="$t({ en: 'Release history', zh: '发布历史' })" name="releases">
              <ReleaseHistory :query-ret="releasesRet" />
            </UICollapseItem>
          </UICollapse>
        </template>
      </div>
    </CommunityCard>
    <ProjectsSection
      v-radar="{ name: 'Popular remixes section', desc: 'Section showing popular remixes of this project' }"
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
  </CenteredWrapper>
</template>

<style scoped lang="scss">
.error {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
  background: var(--ui-color-grey-100);
}

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

  .runner-mask-fade-enter-from,
  .runner-mask-fade-leave-to {
    opacity: 0;
  }

  .runner-mask-fade-enter-active,
  .runner-mask-fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .project-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
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
      border-radius: var(--ui-border-radius-2);
      background: rgba(36, 41, 47, 0.6);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      z-index: 2;
      pointer-events: none;
    }

    .runner-mask.initial {
      pointer-events: auto;
    }

    .sign-in-prompt {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      padding: 24px;

      .sign-in-card {
        position: relative;
        width: 340px;
        padding: 68px 24px 24px;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 24px 32px -16px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        overflow: visible;
      }

      .kiko-wave {
        position: absolute;
        top: -56px;
      }

      .message {
        margin-bottom: 44px;
        line-height: 24px;
        color: var(--ui-color-grey-800);
      }

      .sign-in-button {
        width: 100%;
      }
    }

    :deep(.ui-detailed-loading.cover.mask-semi-transparent .text) {
      color: var(--ui-color-grey-100);
    }

    :deep(.project-runner-surface:not(.fullscreen) .ui-detailed-loading.cover) {
      background: transparent;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      z-index: 3;
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
  min-width: 0;
  padding-right: 20px;
  display: flex;
  flex-direction: column;

  .title {
    font-size: 20px;
    line-height: 1.4;
    color: var(--ui-color-title);
    word-break: break-all;
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

      .icon {
        width: 14px;
        height: 14px;
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
    margin-bottom: 8px;
    flex: 1 1 0;
    overflow-y: auto;
  }
}

.remixes {
  margin-top: 20px;
}
</style>
