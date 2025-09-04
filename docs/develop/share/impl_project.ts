import { ref } from 'vue'
import { useModal, useMessage } from '@/components/ui'
import ProjectScreenshotSharing from './ProjectRecordingSharing.vue'
import ProjectRecordingSharing from './ProjectRecordingSharing.vue'
import { useQuery } from '@/composables/useQuery'
import { getProject } from '@/apis/project'
import type { ProjectData } from '@/apis/project'
import ProjectRunner from '@/components/project/runner/ProjectRunner.vue'
import type { RecordData, CreateRecordParams } from './module_RecordingApis'
import { RecordService } from './module_RecordingApis'
import { saveFile } from '@/models/common/cloud'

type ProjectProps = { owner: string; name: string }
declare const props: ProjectProps

const ScreenShotImg = ref<File | null>(null)
const showScreenShotSharing = ref(false)

const toaster = useMessage()

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

const shareScreenShot = useModal(ProjectScreenshotSharing)

async function handleScreenshotSharing(){
    ProjectRunner.pauseGame()

    const ScreenShotFile = ProjectRunner.getScreenShot()
    ScreenShotImg.value = ScreenShotFile

    showScreenShotSharing.value = true

    try{
        const result = await shareRecording()

        toaster.success(`已分享到${result.platform}`)

    }catch(e){
        console.log(e)
        // cancelled 逻辑，可能用于调试
    }

    ProjectRunner.resumeGame()
}

//=========================================================

const isRecording = ref(false)
const showRecordSharing = ref(false)
const recording = ref<File | null>(null)
const recordData = ref<RecordData | null>(null)

const shareRecording = useModal(ProjectRecordingSharing)

async function handleRecordingSharing() {
    isRecording.value = !isRecording.value
    
    if (!isRecording.value) {
        ProjectRunner.startRecording()
    } else {
        ProjectRunner.stopRecording()
        isRecording.value = false
        ProjectRunner.pauseGame()
        const recordFile = ProjectRunner.getRecordedVideo()
        recording.value = recordFile

        const RecordingURL = await saveFile(recordFile) // 存储到云端获得视频存储URL
        // 等待时间过久，先已改为通过传入 Promise 实现异步优化
      
        const params: CreateRecordParams = {
            projectFullName: `${projectData.value.owner}/${projectData.value.name}`,
            title: projectData.value.name,
            description: projectData.value.description ?? '',
            videoUrl: RecordingURL,
            thumbnailUrl: projectData.value.thumbnail || ''
        }

        const created: RecordData = await RecordingURL.createRecord(params) // 调用 RecordingAPIs 存储到后端
        recordData.value = created
        showRecordSharing.value = true // 唤起录屏分享弹窗

        try{
            const result = await shareRecording()

            if (result.type === 'shared'){
                toaster.success(`已分享到${result.platform}`)
            }else if (result.type === 'rerecord'){
                isRecording.value = true
                ProjectRunner.startRecording()
            }
        }catch(e){
            console.log(e)
            // cancelled 逻辑，可能用于调试
        }

        showRecordSharing.value = false
        ProjectRunner.resumeGame()
    }
}
