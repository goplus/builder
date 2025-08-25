/**
 * 社交平台配置
 */
export type BasicInfo = {
    /** 平台标识符名称 */
    name: string
    /** 本地化显示标签 */
    label: { en: string; zh: string }
    /** 平台品牌颜色 */
    color: string
}

/**
 * 支持分享方式接口
 */
export type ShareType = {
    /** 分享项目页面 */
    supportProject: boolean
    /** 分享海报 */
    supportPoster: boolean
    /** 分享视频 */
    supportVideo: boolean
}

/**
 * 分享方法接口 - 定义三种分享方式，所有方法都是可选的
 */
export interface ShareFunction {
    /** 分享项目页面方法 */
    shareURL?: (url: string) => Promise<string>
    /** 分享海报方法 */
    shareImage?: (image: File) => Promise<string>
    /** 分享视频方法 */
    shareVideo?: (video: File) => Promise<string>
}

/**
 * 平台接口 - 只包含分享相关的功能，不包含basicInfo
 */
export interface PlatformShare {
    shareType: ShareType
    shareFunction: ShareFunction
}

/**
 * 平台配置接口 - 包含平台的基本信息和分享功能
 */
export interface PlatformConfig extends BasicInfo, PlatformShare {}

/**
 * QQ平台实现
 */
class QQPlatform implements PlatformConfig {
    name = 'qq'
    label = { en: 'QQ', zh: 'QQ' }
    color = '#FF6B35'
    platformUrl = 'https://im.qq.com'
    
    shareType = {
        supportProject: true,
        supportPoster: true,
        supportVideo: true
    }
    
    shareFunction = {
        shareURL: async (url: string) => {
            return `url:${url}`
        },
        shareImage: async (image: File) => {
            return `platformUrl:${this.platformUrl},image:${image}`
        },
        shareVideo: async (video: File) => {
            return `platformUrl:${this.platformUrl},video:${video}`
        }
    }
}

/**
 * 微信平台实现 - 只支持项目分享和海报分享
 */
class WeChatPlatform implements PlatformConfig {
    name = 'wechat'
    label = { en: 'WeChat', zh: '微信' }
    color = '#07C160'
    platformUrl = 'https://weixin.qq.com'
    
    shareType = {
        supportProject: true,
        supportPoster: true,
        supportVideo: false
    }
    
    shareFunction = {
        shareURL: async (url: string) => {
            return `url:${url}`
        },
        shareImage: async (image: File) => {
            return `platformUrl:${this.platformUrl},image:${image}`
        }
        // 不实现 shareVideo，因为不支持
    }
}

//class WeChatPlatform implements Platform { ... }
//class DouyinPlatform implements Platform { ... }


// 导出平台配置数组 - 包含完整的平台信息
export const SocialPlatformConfigs: PlatformConfig[] = [
    new QQPlatform(),
    new WeChatPlatform(),

]

// 导出平台功能数组 - 只包含分享功能，不包含basicInfo
export const SocialPlatforms: PlatformShare[] = SocialPlatformConfigs.map(config => ({
    shareType: config.shareType,
    shareFunction: config.shareFunction
}))


/**
 * 直接分享
 * @param platform 平台
 * @param projectUrl 项目链接
 * @returns 分享数据
 */
export async function directShare(platform: PlatformShare, projectUrl: string) {
    if (platform.shareType.supportProject && platform.shareFunction.shareURL) {
        const data = await platform.shareFunction.shareURL(projectUrl)
        return data
    }
    throw new Error('Platform does not support project sharing')
}

/**
 * 分享海报
 * @param platform 平台
 * @param image 图片文件
 * @param projectUrl 项目链接
 * @returns 分享数据
 */
export async function sharePoster(platform: PlatformShare, image: File, projectUrl: string) {
    if (platform.shareType.supportPoster && platform.shareFunction.shareImage) {
        const data = await platform.shareFunction.shareImage(image)
        return data
    }
    throw new Error('Platform does not support poster sharing')
}

/**
 * 分享视频
 * @param platform 平台
 * @param video 视频文件
 * @param projectUrl 项目链接
 * @returns 分享数据
 */
export async function shareVideo(platform: PlatformShare, video: File) {
    if (platform.shareType.supportVideo && platform.shareFunction.shareVideo) {
        const data = await platform.shareFunction.shareVideo(video)
        return data
    }
    throw new Error('Platform does not support video sharing')
}
