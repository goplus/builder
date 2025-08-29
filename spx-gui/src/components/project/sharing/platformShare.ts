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
    supportURL: boolean
    /** 分享海报 */
    supportImage: boolean
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
 * 平台配置接口 - 包含平台的基本信息和分享功能
 */
export interface PlatformConfig {
    shareType: ShareType
    basicInfo: BasicInfo
    shareFunction: ShareFunction
}
/**
 * 平台跳转链接的示例，方便后续接口使用
 */
const platformUrl = 'https://example.com'

/**
 * QQ平台实现
 */
class QQPlatform implements PlatformConfig {
    basicInfo = {
        name: 'qq',
        label: { en: 'QQ', zh: 'QQ' },
        color: '#68a5e1'
    }
    
    shareType = {
        supportURL: true,
        supportImage: true,
        supportVideo: true
    }
    
    shareFunction = {
        shareURL: async (url: string) => {
            return `url:${url}`
        },
        shareImage: async (image: File) => {
            return `platformUrl:${platformUrl},image:${image}`
        },
        shareVideo: async (video: File) => {
            return `platformUrl:${platformUrl},video:${video}`
        }
    }
}

/**
 * 微信平台实现 - 只支持项目分享和海报分享
 */
class WeChatPlatform implements PlatformConfig {
    basicInfo = {
        name: 'wechat',
        label: { en: 'WeChat', zh: '微信' },
        color: '#28c445'
    }
    
    shareType = {
        supportURL: true,
        supportImage: true,
        supportVideo: false
    }
    
    shareFunction = {
        shareURL: async (url: string) => {
            return `url:${url}`
        },
        shareImage: async (image: File) => {
            return `platformUrl:${platformUrl},image:${image}`
        }
        // 不实现 shareVideo，因为不支持
    }
}
class DouyinPlatform implements PlatformConfig {
    basicInfo = {
        name: 'douyin',
        label: { en: 'Douyin', zh: '抖音' },
        color: '#170b1a'
    }
    
    shareType = {
        supportURL: false,
        supportImage: true,
        supportVideo: true
    }
    
    shareFunction = {
        shareImage: async (image: File) => {
            return `platformUrl:${platformUrl},image:${image}`
        },
        shareVideo: async (video: File) => {
            return `platformUrl:${platformUrl},video:${video}`
        }
    }
}

class XiaohongshuPlatform implements PlatformConfig {
    basicInfo = {
        name: 'xiaohongshu',
        label: { en: 'Xiaohongshu', zh: '小红书' },
        color: '#ff0035'
    }
    
    shareType = {
        supportURL: false,
        supportImage: true,
        supportVideo: false
    }
    
    shareFunction = {
        shareImage: async (image: File) => {
            return `platformUrl:${platformUrl},image:${image}`
        }
    }
}  

class BilibiliPlatform implements PlatformConfig {
    basicInfo = {
        name: 'bilibili',
        label: { en: 'Bilibili', zh: 'Bilibili' },
        color: '#d4237a'
    }
    
    shareType = {
        supportURL: false,
        supportImage: false,
        supportVideo: true
    }
    
    shareFunction = {
        shareVideo: async (video: File) => {
            return `platformUrl:${platformUrl},video:${video}`
        }
    }
}

// 导出平台配置数组 - 包含完整的平台信息
export const SocialPlatformConfigs: PlatformConfig[] = [
    new QQPlatform(),
    new WeChatPlatform(),
    new DouyinPlatform(),
    new BilibiliPlatform(),
    new XiaohongshuPlatform(), 
]
