<!--
 * @FileDescription: 实现录屏分享弹窗管理
 * @Author: ceilf6
 * @Date: 2025.9.1
 -->
import { ref, computed, defineProps, defineEmits } from 'vue'
import { directShare, shareVideo, SocialPlatformConfigs } from './module_PlatformShare'
import type { RecordingData } from './module_RecordingApis'
import type { PlatformShare } from './module_PlatformShare'

const props = defineProps<{
    recording: Promise<RecordingData>,
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

const selectedPlatformKey = ref<string>(SocialPlatformConfigs[0]?.name ?? '')
const selectedPlatform = ref<PlatformShare | null>(null)
const jumpUrl = ref<string>('')
