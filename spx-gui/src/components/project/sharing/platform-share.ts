import logoSrc from '@/assets/logo.svg'
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
  /** 分享链接 */
  supportURL: boolean
  /** 分享图片 */
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
 * 从URL中提取owner和name
 * @param url 项目URL，格式如：https://x.qiniu.com/project/nighca_85ff/Walk
 * @returns 拼接后的字符串，格式如：nighca_85ff-Walk
 */
function extractOwnerAndName(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter((part) => part)

    // 查找 'project' 的位置
    const projectIndex = pathParts.indexOf('project')
    if (projectIndex !== -1 && pathParts.length > projectIndex + 2) {
      const owner = pathParts[projectIndex + 1]
      const name = pathParts[projectIndex + 2]
      return `${owner}-${name}`
    }

    // 如果找不到标准格式，返回默认值
    return 'XBuilder'
  } catch (error) {
    console.warn('Failed to parse URL:', url, error)
    return 'XBuilder'
  }
}

declare global {
  interface Window {
    mqq: any
    wx: any
    sha1: any
  }
}

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
      // console.log('shareURL: QQ platform:' + url);
      // 检查是否在 QQ 环境中

      const projectTitle = extractOwnerAndName(url)

      if (typeof window !== 'undefined' && window.mqq && window.mqq.invoke) {
        window.mqq.invoke('data', 'setShareInfo', {
          share_url: url,
          title: projectTitle,
          desc: 'XBuilder分享你的创意作品',
          image_url: logoSrc
        })
      } else {
        console.warn('QQ API not available in current environment')
      }
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
      // const projectTitle = extractOwnerAndName(url)
      // 可以在这里添加微信分享逻辑，使用 projectTitle
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
  new XiaohongshuPlatform(),
  new BilibiliPlatform()
]
