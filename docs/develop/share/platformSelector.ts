/**
 * 社交平台选择器组件
 */
import { SocialPlatformConfigs, PlatformConfig} from "./platformShare"

/**
 * 社交平台组件属性
 */
export type Props = {
    /** 当前选中的平台 (v-model) */
    modelValue?: string
}

/**
 * 社交平台组件事件
 */
export type SharePlatformEmits = {
    /** 传递父组件平台选择变化事件 */
    'change': [platform: PlatformConfig]
}

