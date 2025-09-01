<script setup lang="ts">
import { ref, computed } from 'vue'
import { useExternalUrl } from '@/utils/utils'
// TODO: 暂时注释掉，等 platformShare 模块修复后再启用
// import { directShare, shareVideo, SocialPlatformConfigs } from './platformShare'
// import platformSelector from './platformSelector.vue'
// import type { RecordData } from './RecordingApis.ts'
// TODO: 暂时注释掉，等 platformShare 模块修复后再启用
// import type { PlatformShare } from './platformShare'


//==================================
type RecordData = {
    /** Unique identifier */
    id: string
    /** Creation timestamp */
    createdAt: string
    /** Last update timestamp */
    updatedAt: string
    /** Unique username of the user who created the record */
    owner: string
    /** Full name of the project, in the format `owner/project` */
    projectFullName: string
    /** Display title of the record */
    title: string
    /** Brief description of the record */
    description: string
    /** URL of the recorded video file */
    videoUrl: string
    /** URL of the thumbnail image */
    thumbnailUrl: string
    /** Number of times the record has been viewed */
    viewCount: number
    /** Number of likes the record has received */
    likeCount: number
}
//============================================


const props = defineProps<{
    recording: RecordData,
    video?: File
    visible: boolean
}>()

type SharingResult = {
    type: 'shared'
    platform: string
} | {
    type: 'rerecord'
}
const emit = defineEmits<{
    cancelled: []
    resolved: [result: SharingResult]
}>()

const recordPageUrl = computed(() => {
    return props.recording ? `/record/${props.recording.id}` : ''
})

// TODO: 暂时使用测试值，等 platformShare 模块修复后再使用真实配置
const selectedPlatformKey = ref<string>('test')
const selectedPlatform = ref<any>(null)
const jumpUrl = ref<string>('')

function handlePlatformChange(p: any){
    selectedPlatform.value = p
}

// TODO: 暂时简化实现，等 platformShare 模块修复后再使用完整逻辑
function resolveSelectedPlatform(): any | null {
    // const cfg = SocialPlatformConfigs.find(c => c.name === selectedPlatformKey.value)
    // if (!cfg) return null
    // return { shareType: cfg.shareType, shareFunction: cfg.shareFunction }
    return null
}

async function handleReRecord(): Promise<void> {
    emit('resolved', { type: 'rerecord' })
}

async function handleShareRecording(): Promise<void> {
    if (!props.recording) {
        emit('cancelled')
        return
    }
    
    // TODO: 暂时简化平台选择逻辑，等 platformShare 模块修复后再使用完整逻辑
    // const platform = selectedPlatform.value ?? resolveSelectedPlatform()
    // if (!platform) {
    //     emit('cancelled')
    //     return
    // }

    const platformKey = selectedPlatformKey.value.toLowerCase()

    // TODO: 暂时模拟分享成功，等 platformShare 模块修复后再使用真实分享逻辑
    if ((platformKey === 'qq' || platformKey === 'wechat') && recordPageUrl.value) {
        // jumpUrl.value = await directShare(platform, recordPageUrl.value)
        jumpUrl.value = 'https://example.com/shared'
        emit('resolved', { type: 'shared', platform: selectedPlatformKey.value })
        return
    }

    let videoFile: File | null = null
    if (props.video) { // 优先用传入的video
        videoFile = props.video
    } else if (props.recording?.videoUrl) {
        try {
            const resp = await fetch(props.recording.videoUrl)
            const blob = await resp.blob()
            videoFile = new File([blob], `${props.recording.id}.mp4`, { type: blob.type || 'video/mp4' })
        } catch {
            videoFile = null
        }
    }
    if (!videoFile || !selectedPlatform.value?.shareType?.supportVideo || !selectedPlatform.value?.shareFunction?.shareVideo) {
        emit('cancelled')
        return
    }
    
    // TODO: 暂时模拟分享成功，等 platformShare 模块修复后再使用真实分享逻辑
    // jumpUrl.value = await shareVideo(platform, videoFile)
    jumpUrl.value = 'https://example.com/shared'
    emit('resolved', { type: 'shared', platform: selectedPlatformKey.value })
}

// 使用 useExternalUrl 处理二维码图片的跨域问题
const qrCodeUrl = computed(() =>
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(jumpUrl.value)}`
)

const JumpUrlQRCode = useExternalUrl(qrCodeUrl)
</script>

<template>
    <div class="project-recording-sharing">
        <!-- TODO: 添加录制分享的UI内容 -->
        <div class="recording-sharing-content">
            <h3>录制分享</h3>
            <p>录制ID: {{ recording?.id }}</p>
            <div class="actions">
                <button @click="handleShareRecording">分享录制</button>
                <button @click="handleReRecord">重新录制</button>
                <button @click="$emit('cancelled')">取消</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.project-recording-sharing {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.recording-sharing-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    min-width: 300px;
}

.actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

.actions button {
    padding: 8px 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #f0f0f0;
    cursor: pointer;
}

.actions button:hover {
    background: #e0e0e0;
}
</style>