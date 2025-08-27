/**
 * 社交平台选择器组件
 */
import { SocialPlatformConfigs, PlatformConfig} from "./platformShare"

/**
 * 社交平台组件事件-传递父组件平台选择变化事件
 */
export type SharePlatformEmits = {
    /** 传递父组件平台选择变化事件 */
    'change': [platform: PlatformConfig]
}

