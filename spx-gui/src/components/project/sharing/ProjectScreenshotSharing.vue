<script lang="ts">
import { ref, computed, defineProps, defineEmits } from 'vue'
import Poster from './poster.vue'
import { sharePoster, SocialPlatformConfigs } from './platformShare'
import platformSelector from './platformSelector.vue'
import type { ProjectData } from '@/apis/project'
import type { PlatformShare } from './platformShare'

const props = defineProps<{
    screenshot: File
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

    const posterCompRef = ref<InstanceType<Poster>>()
    const posterFile = await posterCompRef.value.createPoster({ img: props.screenShot, ProjectData: props.projectData})

    jumpUrl.value = await sharePoster(platform, posterFile, window.location.href)
    emit('resolved', selectedPlatformKey.value)
}

const JumpUrlQRCode = computed(() =>
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(jumpUrl.value)}`
)

//<Poster ref="posterCompRef" /> // 到时候挂载组件，及时更新渲染结果
</script>