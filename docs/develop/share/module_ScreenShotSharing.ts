import { ref, computed, defineProps, defineEmits } from 'vue'
import { createPoster } from './module_poster'
import type { ProjectData } from '@/apis/project'
import type { PlatformShare } from './platformShare'
import { sharePoster, SocialPlatformConfigs } from './platformShare'
import platformSelector from './platformSelector.vue'

const props = defineProps<{
    ScreenShot: File | null
    projectData: ProjectData
    visible: boolean
}>()

const emit = defineEmits<{
    cancelled: []
    resolved: [platfrom: string]
}>()

const projectUrlQRCode = computed(() =>
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}`
)

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

async function handleSharePoster(): Promise<void> {
    if (!props.ScreenShot) {
        emit('cancelled')
        return
    }
    const platform = selectedPlatform.value ?? resolveSelectedPlatform()
    if (!platform) {
        emit('cancelled')
        return
    }
    const posterFile = await createPoster({ img: props.ScreenShot, projectData: props.projectData })
    jumpUrl.value = await sharePoster(platform, posterFile, window.location.href)
    emit('resolved', platform)
}

const shareJumpUrlQRCode = computed(() =>
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(jumpUrl.value)}`
)