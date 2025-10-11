<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageHandle, DefaultException, capture } from '@/utils/exception'
import { useQuery } from '@/utils/query'
import { useIsLikingProject, useLikeProject, useUnlikeProject } from '@/stores/liking'
import { humanizeCount, humanizeExactCount, untilNotNull } from '@/utils/utils'
import { useEnsureSignedIn } from '@/utils/user'
import { usePageTitle } from '@/utils/utils'
import {
  ownerAll,
  recordProjectView,
  stringifyProjectFullName,
  stringifyRemixSource,
  Visibility,
  getProject
} from '@/apis/project'
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
import { initShareInfo, type Disposer } from '@/components/project/sharing/platform-share'
import { useModal } from '@/components/ui'
import ProjectRecordingSharing from '@/components/project/sharing/ProjectRecordingSharing.vue'
import ProjectScreenshotSharing from '@/components/project/sharing/ProjectScreenshotSharing.vue'
import type { RecordingData, CreateRecordingParams } from '@/apis/recording'
import { createRecording, deleteRecording } from '@/apis/recording'
import { saveFile } from '@/models/common/cloud'
import { File } from '@/models/common/file'
import { Input, Output, Conversion, ALL_FORMATS, BlobSource, Mp4OutputFormat, BufferTarget } from 'mediabunny'
import { useMessage } from '@/components/ui'
import { useI18n } from '@/utils/i18n'

const message = useMessage()
const { t } = useI18n()
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
    // 在移动端显示分享提示蒙版
    if (isMobile.value) {
      showMobileShareHint.value = true
      return
    }
    if (!projectData.value) return
    return shareProject(projectData.value)
  },
  {
    en: 'Failed to share project',
    zh: '分享项目失败'
  }
)
// 移动端分享提示状态
const showMobileShareHint = ref(false)

// 关闭移动端分享提示
function closeMobileShareHint() {
  showMobileShareHint.value = false
}

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
const isMobile = useResponsive('mobile')
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

const isRecording = ref(false)
const recording = ref<globalThis.File | null>(null)
const recordData = ref<RecordingData | null>(null)

const shareRecording = useModal(ProjectRecordingSharing)

// Start recording
async function startRecording() {
  // Check if recording feature is available
  if (!projectRunnerRef.value?.startRecording) {
    throw new DefaultException({
      en: 'Recording feature is not available, please make sure the project is running',
      zh: '录制功能不可用，请确保项目正在运行'
    })
  }

  await projectRunnerRef.value.startRecording()
  isRecording.value = true
  return undefined // Explicitly return undefined to indicate recording start
}

// Stop recording and get recording data
async function stopRecording(): Promise<globalThis.File> {
  await projectRunnerRef.value?.pauseGame() // Pause the game first to prevent gaps
  const recordBlob = await projectRunnerRef.value?.stopRecording?.()

  if (!recordBlob) {
    throw new DefaultException({
      en: 'Recording failed, no recording data obtained',
      zh: '录制失败，未获得录制数据'
    })
  }

  // Convert Blob to File object
  const fileExtension = recordBlob.type?.includes('webm') ? 'webm' : 'mp4'
  const recordFile = new globalThis.File([recordBlob], `recording_${Date.now()}.${fileExtension}`, {
    type: recordBlob.type || 'video/webm'
  })

  recording.value = recordFile
  return recordFile
}

function saveRecording(recordFile: globalThis.File): Promise<RecordingData> {
  return (async (): Promise<RecordingData> => {
    if (!projectData.value) {
      throw new DefaultException({
        en: 'Failed to load project data',
        zh: '项目数据加载失败'
      })
    }

    let finalVideoFile = recordFile
    try {
      finalVideoFile = await convertWebmToMp4(recordFile)
    } catch (error) {
      console.error('视频转换失败，使用原始文件:', error)
      message.warning(
        t({
          en: 'Video format conversion failed. Please try a different browser.',
          zh: '视频格式转换失败，请尝试换个浏览器。'
        })
      )
    }

    const projectFile = createProjectFile(finalVideoFile)
    const RecordingURL = await saveFile(projectFile) // Store to cloud and get video storage URL

    const params: CreateRecordingParams = {
      projectFullName: `${projectData.value.owner}/${projectData.value.name}`,
      title: projectData.value.name,
      description: projectData.value.description ?? '',
      videoUrl: RecordingURL,
      thumbnailUrl: projectData.value.thumbnail || ''
    }

    const created: RecordingData = await createRecording(params) // Call Recording APIs to store to backend
    recordData.value = created
    return created
  })()
}

async function convertWebmToMp4(webmVideo: globalThis.File): Promise<globalThis.File> {
  try {
    const input = new Input({
      source: new BlobSource(webmVideo),
      formats: ALL_FORMATS
    })

    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget()
    })

    const conversion = await Conversion.init({
      input,
      output,
      video: () => ({
        codec: 'av1'
      }),
      audio: () => ({
        codec: 'aac'
      })
    })

    const hasVideoTrack = conversion.utilizedTracks.some((track) => track.type === 'video')
    const hasAudioTrack = conversion.utilizedTracks.some((track) => track.type === 'audio')

    if (!hasVideoTrack) {
      throw new Error('Transcoding failed: Video track was dropped, cannot generate a valid MP4 file')
    }

    if (!hasAudioTrack) {
      console.warn('[Recording] Warning: Audio track was dropped')
    }

    await conversion.execute()

    const buffer = output.target.buffer
    if (!buffer) throw new Error('Transcoding failed: Output buffer is empty')

    // Filename is hardcoded since saveFile() will generate its own identifier anyway
    // and this filename won't be used in the final cloud storage URL
    const mp4File = new globalThis.File([buffer], 'converted.mp4', {
      type: 'video/mp4'
    })

    return mp4File
  } catch (error) {
    console.error('[Recording] Mediabunny transcoding failed:', error)
    throw error
  }
}

// Handle recording sharing results
async function handleShareResult(result: any, recordingToDelete: RecordingData | null) {
  if (result.type === 'shared') {
    return result.platform
  } else if (result.type === 'rerecord') {
    if (recordingToDelete) {
      deleteRecording(recordingToDelete.id).catch((error) => {
        capture(error, {
          en: 'Failed to delete previous recording',
          zh: '删除旧录屏失败'
        })
      })
    }

    // Resume game first, then start new recording
    await projectRunnerRef.value?.resumeGame()
    isRecording.value = true
    await projectRunnerRef.value?.startRecording?.()
    return null // Explicitly return null to indicate stopped recording but no sharing
  }
}

// Main recording handler function
const handleRecordingSharing = useMessageHandle(
  async () => {
    await ensureSignedIn()
    if (!isRecording.value) {
      // Start recording
      return await startRecording()
    }

    // Stop recording and get data
    const recordFile = await stopRecording()
    const recordingPromise = saveRecording(recordFile)

    try {
      const result = await shareRecording({
        recording: recordingPromise,
        video: recordFile
      })

      const recordingData = await recordingPromise.catch(() => null)
      return await handleShareResult(result, recordingData)
    } finally {
      await projectRunnerRef.value?.resumeGame()
      isRecording.value = false
    }
  },
  {
    en: 'Recording operation failed',
    zh: '录制操作失败'
  },
  (result) => {
    // Note: The isRecording.value state may have changed during function execution
    // We need to determine whether recording started or stopped based on return value
    if (result) {
      // Has return value means sharing succeeded
      return { en: `Shared to ${result}`, zh: `已分享到${result}` }
    } else if (result === null) {
      // Explicitly return null means stopped recording but no sharing
      return { en: 'Recording stopped', zh: '录制已停止' }
    } else {
      // undefined means started recording
      return { en: 'Recording started, click again to stop', zh: '录制已开始，再次点击停止录制' }
    }
  }
)

const screenshotImg = ref<globalThis.File | null>(null)

const shareScreenshot = useModal(ProjectScreenshotSharing)

// Handle screenshot sharing with proper error handling
const handleScreenshotSharing = useMessageHandle(
  async (): Promise<void> => {
    await projectRunnerRef.value?.pauseGame()

    try {
      const screenshotBlob = await projectRunnerRef.value?.takeScreenshot()
      if (!screenshotBlob) {
        throw new DefaultException({
          en: 'Failed to take screenshot',
          zh: '截图失败'
        })
      }

      // Convert Blob to File
      const screenshotFile = new globalThis.File([screenshotBlob], 'screenshot.png', {
        type: screenshotBlob.type || 'image/png',
        lastModified: Date.now()
      })

      screenshotImg.value = screenshotFile

      if (!projectData.value) {
        throw new DefaultException({
          en: 'Project data not available',
          zh: '项目数据不可用'
        })
      }

      await shareScreenshot({
        screenshot: screenshotFile,
        projectData: projectData.value
      })
    } finally {
      // no matter success or reject , finnally must resume the game
      await projectRunnerRef.value?.resumeGame()
    }
  },
  {
    en: 'Failed to share screenshot',
    zh: '分享截图失败'
  },
  {
    en: 'Screenshot shared successfully',
    zh: '截图分享成功'
  }
)
//初始化分享信息
watchEffect((onCleanup) => {
  let dispose: Disposer | null = null

  initShareInfo().then((disposer) => {
    dispose = disposer
  })

  onCleanup(() => {
    if (dispose) {
      dispose()
    }
  })
})
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
        <div class="project-wrapper" :class="{ recording: isRecording }">
          <template v-if="project != null">
            <ProjectRunner ref="projectRunnerRef" :key="`${project.owner}/${project.name}`" :project="project" />
            <div v-show="runnerState === 'initial' && !isMobile" class="runner-mask">
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
            v-radar="{ name: 'Screenshot button', desc: 'Click to take a screenshot' }"
            type="boring"
            :disabled="handleScreenshotSharing.isLoading.value"
            @click="handleScreenshotSharing.fn"
          >
            <!--&& !isMobile"-->
            <template #icon>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.5" fill="none" />
                <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" fill="none" />
                <path
                  d="M6 4L6.5 2.5A1 1 0 0 1 7.5 2h1A1 1 0 0 1 9.5 2.5L10 4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  fill="none"
                />
              </svg>
            </template>
            {{ $t({ en: 'Screenshot', zh: '截屏' }) }}
          </UIButton>
          <UIButton
            v-if="runnerState === 'running'"
            v-radar="{ name: 'Recording button', desc: 'Click to start/stop recording' }"
            :type="isRecording ? 'danger' : 'boring'"
            :loading="handleRecordingSharing.isLoading.value"
            @click="handleRecordingSharing.fn"
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
            <template v-if="isOwner && !isMobile">
              <UIButton
                v-radar="{ name: 'Edit button', desc: 'Click to edit the project' }"
                type="primary"
                size="large"
                icon="edit2"
                :loading="handleEdit.isLoading.value"
                @click="handleEdit.fn"
                >{{
                  $t({
                    en: 'Edit',
                    zh: '编辑'
                  })
                }}</UIButton
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
                >{{
                  $t({
                    en: 'Publish',
                    zh: '发布'
                  })
                }}</UIButton
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
                    >{{
                      $t({
                        en: 'Unpublish',
                        zh: '取消发布'
                      })
                    }}</UIMenuItem
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
                v-if="hasRelease && !isMobile"
                v-radar="{ name: 'Remix button', desc: 'Click to remix this project' }"
                type="primary"
                size="large"
                icon="remix"
                :loading="handleRemix.isLoading.value"
                @click="handleRemix.fn"
              >
                {{ $t({ en: 'Remix', zh: '改编' }) }}</UIButton
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
  <!-- 移动端分享提示蒙版 -->
  <div v-if="showMobileShareHint" class="mobile-share-hint-overlay" @click="closeMobileShareHint">
    <div class="mobile-share-hint-content">
      <div class="hint-arrow">
        <UIIcon class="icon" type="arrowShare" />
      </div>
      <div class="hint-text">
        {{
          $t({
            en: 'please click the upper right button to send it to the designated friend',
            zh: '请点击右上角将它发送给指定朋友'
          })
        }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/components/ui/responsive.scss';

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

  @include responsive(mobile) {
    flex-direction: column;
    gap: 20px;
  }
}

.left {
  flex: 1 1 744px;

  @include responsive(mobile) {
    flex: 1 1 0;
  }

  .project-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: var(--ui-border-radius-1);
    overflow: hidden;
    transition: box-shadow 0.3s ease-in-out;

    // Green border when recording
    &.recording {
      box-shadow:
        0 0 0 4px var(--ui-color-success-main),
        0 0 20px var(--ui-color-success-300);
    }

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

/* 移动端分享提示蒙版样式 */
.mobile-share-hint-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: right;
  color: #fff;

  @include responsive(mobile) {
    .mobile-share-hint-content {
      padding: 0 24px;
      text-align: center;
      max-width: 280px;

      .hint-arrow {
        margin: 25px 0;
        display: flex;
        justify-content: right;

        .icon {
          transform: scale(4);
        }
      }

      .hint-text {
        font-size: 16px;
        margin-bottom: 20px;
        line-height: 1.4;
      }
    }
  }
}
</style>
