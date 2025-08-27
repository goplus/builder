import { ref, computed, defineProps, defineEmits } from 'vue'
import type { ProjectData } from '@/apis/project'
import type { PlatformShare } from './platformShare'
import { sharePoster, SocialPlatformConfigs } from './platformShare'
import Poster from './poster.vue'

const props = defineProps<{
    screenshot: File
    projectData: ProjectData
    visible: boolean
}>()

const emit = defineEmits<{
    cancelled: []
    resolved: [platfrom: string]
}>()

const selectedPlatformKey = ref<string>(SocialPlatformConfigs[0]?.name ?? '')
const selectedPlatform = ref<PlatformShare | null>(null)
const jumpUrl = ref<string>('')