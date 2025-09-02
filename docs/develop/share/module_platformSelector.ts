/**
 * 社交平台选择器组件
 */
import { SocialPlatformConfigs, PlatformConfig} from "./platformShare"
import { defineProps, defineEmits } from 'vue'

const props = defineProps<{
    /** 接收父组件传递的平台选择以同步数据 */
    modelValue?: PlatformConfig
}>()
/**
 * 社交平台组件事件-传递父组件平台选择变化事件
 */
const emit = defineEmits<{
    /** v-model 更新（平台选择变化),传递父组件平台选择变化事件 */
    'update:modelValue': [platform: PlatformConfig]
}>()


