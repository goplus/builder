/**
 * 社交平台配置
 */
export type SocialPlatform = {
    /** 平台标识符名称 */
    name: string
    /** 本地化显示标签 */
    label: { en: string; zh: string }
    /** 平台品牌颜色 */
    color: string
    /** 平台跳转链接 */
    url: string
}

/**
 * 社交平台组件属性
 */
export type Props = {
    /** 当前选中的平台 (v-model) */
    modelValue?: string
    /** 是否显示分组标签 */
    showLabel?: boolean
    /** 自定义平台配置 */
    platforms?: SocialPlatform[]
}

/**
 * 社交平台组件事件
 */
export type SharePlatformEmits = {
    /** 平台选择变化 (v-model) */
    'update:modelValue': [value: string]
    /** 平台选择变化事件 */
    'change': [platform: SocialPlatform]
}


// 默认社交平台配置
const defaultSocialPlatforms: SocialPlatform[] = [
  { name: 'qq', label: { en: 'QQ', zh: 'QQ' }, color: '#FF6B35', url: 'https://im.qq.com' },
  { name: 'wechat', label: { en: 'WeChat', zh: '微信' }, color: '#07C160', url: 'https://weixin.qq.com' },
  { name: 'douyin', label: { en: 'TikTok', zh: '抖音' }, color: '#000000', url: 'https://www.douyin.com' },
  { name: 'xiaohongshu', label: { en: 'RedNote', zh: '小红书' }, color: '#FF2442', url: 'https://www.xiaohongshu.com' },
  { name: 'bilibili', label: { en: 'Bilibili', zh: 'b站' }, color: '#FB7299', url: 'https://www.bilibili.com' }
]

 /**
 * 按名称获取平台
 * @param name - 平台标识符
 * @returns 平台配置或未找到时返回undefined
 */
export function getPlatformByName(name: string): SocialPlatform | undefined {
    return defaultSocialPlatforms.find(p => p.name === name)
}
