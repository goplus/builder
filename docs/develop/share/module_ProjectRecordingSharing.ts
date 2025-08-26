import { ref, computed, defineProps, defineEmits } from 'vue'
import { directShare, shareVideo, SocialPlatformConfigs } from './platformShare'
import platformSelector from './platformSelector.vue'
import type { RecordData } from './module_RecordingApis'
import type { PlatformShare } from './platformShare'

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

const selectedPlatformKey = ref<string>(SocialPlatformConfigs[0]?.name ?? '')
const selectedPlatform = ref<PlatformShare | null>(null)
const jumpUrl = ref<string>('')

function handlePlatformChange(p: PlatformShare){
    selectedPlatform.value = p
}

function resolveSelectedPlatform(): PlatformShare | null {
    const cfg = SocialPlatformConfigs.find(c => c.name === selectedPlatformKey.value)
    if (!cfg) return null
    return { shareType: cfg.shareType, shareFunction: cfg.shareFunction }
}

async function handleReRecord(): Promise<void> {
    emit('resolved', { type: 'rerecord' })
}

async function handleShareRecording(): Promise<void> {
    if (!props.recording) {
        emit('cancelled')
        return
    }
    const platform = selectedPlatform.value ?? resolveSelectedPlatform()
    if (!platform) {
        emit('cancelled')
        return
    }

    const platformKey = selectedPlatformKey.value.toLowerCase()

    if ((platformKey === 'qq' || platformKey === 'wechat') && recordPageUrl.value) {
        jumpUrl.value = await directShare(platform, recordPageUrl.value)
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
    if (!videoFile || !platform.shareType.supportVideo || !platform.shareFunction.shareVideo) {
        emit('cancelled')
        return
    }
    jumpUrl.value = await shareVideo(platform, videoFile)
    emit('resolved', { type: 'shared', platform: selectedPlatformKey.value })
}

const JumpUrlQRCode = computed(() =>
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(jumpUrl.value)}`
)