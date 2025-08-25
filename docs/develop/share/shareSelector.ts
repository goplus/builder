/**
 * 社交平台选择器组件
 */

import { SocialPlatformConfigs, PlatformShare} from "./sharePlatform"

/**
 * 社交平台组件属性
 */
export type Props = {
    /** 当前选中的平台 (v-model) */
    modelValue?: string
    /** 是否显示分组标签 */
    showLabel?: boolean
}

/**
 * 社交平台组件事件
 */
export type SharePlatformEmits = {
    /** 平台选择变化 (v-model) */
    'update:modelValue': [value: string]
    /** 平台选择变化事件 */
    'change': [platform: PlatformShare]
}

