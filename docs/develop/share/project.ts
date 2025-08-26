import { ref } from 'vue'
import { createPoster } from './poster'
import ScreenShotSharing from './ScreenShotSharing.vue'
import { useQuery } from '@/composables/useQuery'
import { getProject } from '@/apis/project'
import type { ProjectData } from '@/apis/project'

const ScreenShotImg = ref<File | null>(null)
const showScreenShotSharing = ref(false)

const {
  data: projectData,
  isLoading,
  error,
  refetch: reloadProject
} = useQuery(
  async (ctx) => {
    return await getProject(props.owner, props.name, ctx.signal)
  },
  {
    en: 'Failed to load project',
    zh: '加载项目失败'
  }
)

async function onClickScreenShot() {
    window.pauseGame()
    const ScreenShotFile = window.getScreenshot()
    ScreenShotImg.value = ScreenShotFile
    showScreenShotSharing.value = true
}

function closeScreenShotSharing() {
    showScreenShotSharing.value = false
    window.resumeGame()
}


//=========================================================


import ProjectRecordingSharing from './ProjectRecordingSharing.vue'
import type { RecordData, CreateRecordParams } from './module_RecordingApis'
import { RecordService } from './module_RecordingApis'
import { saveFile } from '@/models/common/cloud'

const isRecording = ref(false)
const showRecordSharing = ref(false)
const setRecordingURL = ref<string | null>(null)
const recording = ref<File | null>(null)
const recordData = ref<RecordData | null>(null)

async function onClickRecord() {
    isRecording.value = !isRecording.value
    
    if (!isRecording.value) {
        window.startRecording()
    } else {
        window.stopRecording()
        window.pauseGame()
        const recordFile = window.getRecordedVideo()

        const RecordingURL = await saveFile(recordFile) // 存储到云端获得视频存储URL
        const params: CreateRecordParams = {
            projectFullName: `${projectData.value.owner}/${projectData.value.name}`,
            title: projectData.value.name,
            description: projectData.value.description ?? '',
            videoUrl: RecordingURL,
            thumbnailUrl: projectData.value.thumbnail || ''
        }

        const created: RecordData = await RecordingURL.createRecord(params) // 1.调用 RecordingAPIs 存储到后端
        recordData.value = created
        /*
        const gotRecordID = created.id// 2.调用 RecordingAPIs 获取视频存储ID
        const gotshowRecordingURL = `{created}` // 3.拼接ID 获得录屏展示页面的 URL 传给录屏展示模块
        setRecordingURL.value = gotshowRecordingURL
        */
        recording.value = recordFile
        showRecordSharing.value = true // 唤起录屏分享弹窗
    }
}

function closeRecordSharing() {
    showRecordSharing.value = false
    window.resumeGame()
}


// 处理子组件ProjectRecordingSharing中点击ReRecord后上传的事件
function handleUpdateIsRecording(value: boolean) {
    isRecording.value = value
}

function handleUpdateShowRecording(value: boolean) {
    showRecordSharing.value = value
}

function handleReRecord() {
    // 处理重新录制逻辑
    window.startRecording()
}