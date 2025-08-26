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

import { useModal } from '@/components/ui'
import ProjectScreenShotSharing from './ProjectRecordingSharing.vue'
const shareScreenShot = useModal(ProjectScreenShotSharing)

async function handleScreenShotSharing(){
    window.pauseGame()

    const ScreenShotFile = window.getScreenShot()
    ScreenShotImg.value = ScreenShotFile

    showScreenShotSharing.value = true

    try{
        const result = await shareRecording()

        toaster.success(`已分享到${result.platform}`)

    }catch(e){
        console.log(e)
        // cancelled 逻辑，可能用于调试
    }

    window.resumeGame()
}


//=========================================================

import type { RecordData, CreateRecordParams } from './module_RecordingApis'
import { RecordService } from './module_RecordingApis'
import { saveFile } from '@/models/common/cloud'

const isRecording = ref(false)
const showRecordSharing = ref(false)
const recording = ref<File | null>(null)
const recordData = ref<RecordData | null>(null)

import { useModal } from '@/components/ui'
import ProjectRecordingSharing from './ProjectRecordingSharing.vue'
const shareRecording = useModal(ProjectRecordingSharing)

async function handleRecordingSharing() {
    isRecording.value = !isRecording.value
    
    if (!isRecording.value) {
        window.startRecording()
    } else {
        window.stopRecording()
        isRecording.value = false
        window.pauseGame()
        const recordFile = window.getRecordedVideo()
        recording.value = recordFile

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
        showRecordSharing.value = true // 唤起录屏分享弹窗

        try{
            const result = await shareRecording()

            if (result.type === 'shared'){
                toaster.success(`已分享到${result.platform}`)
            }else if (result.type === 'rerecord'){
                isRecording.value = true
                window.startRecording()
            }
        }catch(e){
            console.log(e)
            // cancelled 逻辑，可能用于调试
        }

        showRecordSharing.value = false
        window.resumeGame()
    }
}