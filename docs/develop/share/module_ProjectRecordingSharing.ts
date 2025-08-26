import { ref, computed, defineProps, defineEmits } from 'vue'
import type { PlatformShare } from './platformShare'
import { directShare } from './platformShare'
import QRCode from 'qrcode'
import platformSelector from './platformSelector.vue'
import { RecordData } from './module_RecordingApis'

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
    return props.Recording ? `/record/$(props.Recording.id)` : ''
})

const jumpUrl = ref<string>('')