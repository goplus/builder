<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageHandle } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { useIsLikingProject, useLikeProject, useUnlikeProject } from '@/stores/liking'
import { humanizeCount, humanizeExactCount, untilNotNull } from '@/utils/utils'
import { useEnsureSignedIn } from '@/utils/user'
import { usePageTitle } from '@/utils/utils'
import { ownerAll, recordProjectView, stringifyProjectFullName, stringifyRemixSource, Visibility } from '@/apis/project'
import { listProject } from '@/apis/project'
import { listReleases } from '@/apis/project-release'
import { Project } from '@/models/project'
import { useUser, isSignedIn, getSignedInUsername } from '@/stores/user'
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
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'
import FullScreenProjectRunner from '@/components/project/runner/FullScreenProjectRunner.vue'
import RemixedFrom from '@/components/community/project/RemixedFrom.vue'
import OwnerInfo from '@/components/community/project/OwnerInfo.vue'
import { useCreateProject, useRemoveProject, useShareProject, useUnpublishProject } from '@/components/project'
import CommunityCard from '@/components/community/CommunityCard.vue'
import ReleaseHistory from '@/components/community/project/ReleaseHistory.vue'
import TextView from '@/components/community/TextView.vue'
import { getProject } from '@/apis/project'
// import { SocialPlatformConfigs } from '@/components/project/sharing/platform-share'
// import { getProjectShareRoute } from '@/router'
import { useModal, useMessage } from '@/components/ui'
import ProjectRecordingSharing from '@/components/project/sharing/ProjectRecordingSharing.vue'
import type { RecordingData, CreateRecordingParams } from '@/apis/recording'
import { createRecording } from '@/apis/recording'
import { saveFile } from '@/models/common/cloud'
import { File } from '@/models/common/file'

function createProjectFile(webFile: globalThis.File): File {
  const loader = async () => {
    return await webFile.arrayBuffer()
  }

  return new File(webFile.name, loader, {
    type: webFile.type,
    lastModified: webFile.lastModified
  })
}

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

const projectRunnerRef = ref<InstanceType<typeof ProjectRunner> | null>(null)
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

const handleRun = useMessageHandle(
  async () => {
    runnerState.value = 'loading'
    await projectRunnerRef.value?.run()
    runnerState.value = 'running'
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

const handleRerun = useMessageHandle(async () => projectRunnerRef.value?.rerun(), {
  en: 'Failed to rerun project',
  zh: '重新运行项目失败'
})

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

const { data: projectData } = useQuery(
  async (ctx) => {
    return await getProject(props.owner, props.name, ctx.signal)
  },
  {
    en: 'Failed to load project',
    zh: '加载项目失败'
  }
)

const shareProject = useShareProject()

const handleShare = useMessageHandle(
  () => {
    if (!projectData.value) return
    shareProject(projectData.value)
  },
  {
    en: 'Failed to share project',
    zh: '分享项目失败'
  }
)

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

const toaster = useMessage()
const isRecording = ref(false)
const recording = ref<globalThis.File | null>(null)
const recordData = ref<RecordingData | null>(null)

const shareRecording = useModal(ProjectRecordingSharing)

async function handleRecordingSharing() {
  if (isRecording.value) {
    // 当前正在录制，停止录制
    try {
      await projectRunnerRef.value?.pauseGame() // 先暂停游戏，防止间隙
      // console.log('正在停止录制...')
      const recordBlob = await projectRunnerRef.value?.stopRecording?.()

      if (!recordBlob) {
        toaster.error('录制失败，未获得录制数据')
        isRecording.value = false
        return
      }

      // 将 Blob 转换为 File 对象
      const fileExtension = recordBlob.type?.includes('webm') ? 'webm' : 'mp4'
      const recordFile = new globalThis.File([recordBlob], `recording_${Date.now()}.${fileExtension}`, {
        type: recordBlob.type || 'video/webm'
      })

      recording.value = recordFile

      // 创建异步处理录制数据的 Promise
      const recordingPromise = (async (): Promise<RecordingData> => {
        try {
          if (!projectData.value) {
            throw new Error('项目数据加载失败')
          }

          const projectFile = createProjectFile(recordFile)
          const RecordingURL = await saveFile(projectFile) // 存储到云端获得视频存储URL

          const params: CreateRecordingParams = {
            projectFullName: `${projectData.value.owner}/${projectData.value.name}`,
            title: projectData.value.name,
            description: projectData.value.description ?? '',
            videoUrl: RecordingURL,
            thumbnailUrl: projectData.value.thumbnail || ''
          }

          const created: RecordingData = await createRecording(params) // 调用 RecordingAPIs 存储到后端
          recordData.value = created
          return created
        } catch (error) {
          console.error('录制处理失败:', error)
          throw error
        }
      })()

      try {
        const result = await shareRecording({
          recording: recordingPromise,
          video: recordFile
        })

        if (result.type === 'shared') {
          toaster.success(`已分享到${result.platform}`)
        } else if (result.type === 'rerecord') {
          // 先恢复游戏，然后开始新的录制
          await projectRunnerRef.value?.resumeGame()
          isRecording.value = true
          await projectRunnerRef.value?.startRecording?.()
          return
        }
      } catch (e) {
        // cancelled 逻辑，用户取消分享
      }

      await projectRunnerRef.value?.resumeGame()
      isRecording.value = false
    } catch (error) {
      console.error('停止录制失败:', error)
      toaster.error('停止录制失败')
      isRecording.value = false
    }
  } else {
    // 开始录制
    try {
      // 检查录制功能是否可用
      if (!projectRunnerRef.value?.startRecording) {
        toaster.error('录制功能不可用，请确保项目正在运行')
        return
      }

      await projectRunnerRef.value?.startRecording?.()
      isRecording.value = true
      toaster.success('录制已开始，再次点击停止录制')
    } catch (error) {
      console.error('开始录制失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      toaster.error(`开始录制失败: ${errorMessage}`)
    }
  }
}
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
            <ProjectRunner ref="projectRunnerRef" :key="`${project.owner}/${project.name}`" :project="project" />
            <div v-show="runnerState === 'initial'" class="runner-mask">
              <UIButton
                v-radar="{ name: 'Run button', desc: 'Click to run the project' }"
                class="run-button"
                type="primary"
                size="large"
                icon="playHollow"
                :disabled="projectRunnerRef == null"
                :loading="handleRun.isLoading.value"
                @click="handleRun.fn"
                >{{ $t({ en: 'Run', zh: '运行' }) }}</UIButton
              >
            </div>
          </template>
        </div>
        <FullScreenProjectRunner
          v-if="project != null"
          :project="project"
          :visible="isFullScreenRunning"
          @close="isFullScreenRunning = false"
        />
        <div class="ops">
          <UIButton
            v-if="runnerState === 'running'"
            v-radar="{ name: 'Recording button', desc: 'Click to start/stop recording' }"
            :type="isRecording ? 'danger' : 'boring'"
            @click="handleRecordingSharing"
          >
            <template #icon>
              <svg
                v-if="!isRecording"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none" />
                <circle cx="8" cy="8" r="2" fill="currentColor" />
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="5" width="6" height="6" fill="currentColor" />
              </svg>
            </template>
            {{
              isRecording ? $t({ en: 'Stop Recording', zh: '停止录制' }) : $t({ en: 'Start Recording', zh: '开始录制' })
            }}
          </UIButton>
          <UIButton
            v-if="runnerState === 'initial'"
            v-radar="{ name: 'Full screen run button', desc: 'Click to run project in full screen' }"
            type="primary"
            icon="fullScreen"
            @click="isFullScreenRunning = true"
          >
            {{ $t({ en: 'Run in full screen', zh: '全屏运行' }) }}
          </UIButton>
          <UIButton
            v-if="runnerState === 'running'"
            v-radar="{ name: 'Rerun button', desc: 'Click to rerun the project' }"
            type="primary"
            icon="rotate"
            :disabled="projectRunnerRef == null"
            :loading="handleRerun.isLoading.value"
            @click="handleRerun.fn"
          >
            {{ $t({ en: 'Rerun', zh: '重新运行' }) }}
          </UIButton>
          <UIButton
            v-if="runnerState === 'running'"
            v-radar="{ name: 'Stop button', desc: 'Click to stop the running project' }"
            type="boring"
            icon="end"
            @click="handleStop.fn"
          >
            {{ $t({ en: 'Stop', zh: '停止' }) }}
          </UIButton>
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
