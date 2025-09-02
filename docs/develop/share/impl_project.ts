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
    
    if (isRecording.value) {
        // 开始录制
        ProjectRunner.startRecording()
    } else {
        // 停止录制
        try {
            console.log('正在停止录制...')
            const recordBlob = await ProjectRunner.stopRecording() // stopRecording 直接返回 Blob
            ProjectRunner.pauseGame()
            
            console.log('录制已停止，获得 Blob:', recordBlob)
            
            // 将 Blob 转换为 File 对象
            const fileExtension = recordBlob?.type?.includes('webm') ? 'webm' : 'mp4'
            const recordFile = new globalThis.File([recordBlob], `recording_${Date.now()}.${fileExtension}`, { 
                type: recordBlob?.type || 'video/webm' 
            })
            recording.value = recordFile

            const RecordingURL = await saveFile(recordFile) // 存储到云端获得视频存储URL
            const params: CreateRecordParams = {
                projectFullName: `${projectData.value.owner}/${projectData.value.name}`,
                title: projectData.value.name,
                description: projectData.value.description ?? '',
                videoUrl: RecordingURL,
                thumbnailUrl: projectData.value.thumbnail || ''
            }

            const created: RecordData = await RecordService.createRecord(params) // 调用 RecordingAPIs 存储到后端
            recordData.value = created
            showRecordSharing.value = true // 唤起录屏分享弹窗

            try{
                const result = await shareRecording({
                    recording: created,
                    video: recordFile
                })

                if (result.type === 'shared'){
                    toaster.success(`已分享到${result.platform}`)
                }else if (result.type === 'rerecord'){
                    isRecording.value = true
                    ProjectRunner.startRecording()
                    return // 不恢复游戏，继续录制
                }
            }catch(e){
                console.log(e)
                // cancelled 逻辑，用户取消分享
            }

            showRecordSharing.value = false
            ProjectRunner.resumeGame()
        } catch (error) {
            console.error('录制处理失败:', error)
            toaster.error('录制处理失败，请重试')
            ProjectRunner.resumeGame()
            isRecording.value = false
        }
    }
}