import { getWeChatJSSDKConfig } from '@/apis/wechat'
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
 * 分享信息接口
 */
export interface ShareInfo {
  /** 分享标题 */
  title?: string
  /** 分享描述 */
  desc?: string
  /** 其他扩展字段 */
  [key: string]: any
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
  initShareInfo: (shareInfo?: ShareInfo) => Promise<void>
}
/**
 * 平台跳转链接的示例，方便后续接口使用
 */
const platformUrl = 'https://example.com'

/*
来自于qqapi.js的声明，为了保证qqapi.js的正常运行，需要声明window对象
*/
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
    supportVideo: false
  }

  shareFunction = {
    shareURL: async (url: string) => {
      return url
    },
    shareImage: async (image: File) => {
      return `platformUrl:${platformUrl},image:${image}`
    },
    shareVideo: async (video: File) => {
      return `platformUrl:${platformUrl},video:${video}`
    }
  }

  initShareInfo = async (shareInfo?: ShareInfo) => {
    if (window.mqq && window.mqq.invoke) {
      window.mqq.invoke('data', 'setShareInfo', {
        share_url: location.href,
        title: shareInfo?.title || 'XBulider',
        desc: shareInfo?.desc || 'XBuilder分享你的创意作品',
        image_url: location.origin + '/logo.png'
      })
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
      return url
    },

    shareImage: async (image: File) => {
      return `platformUrl:${platformUrl},image:${image}`
    }
    // 不实现 shareVideo，因为不支持
  }

  initShareInfo = async (shareInfo?: ShareInfo) => {
    // 微信平台设置分享信息
    const config = await getWeChatJSSDKConfig({
      url: location.href
    })
    //初始化微信分享信息
    if (window.wx && window.wx.config) {
      window.wx.config({
        debug: false,
        appId: config.appId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData']
      })

      // 配置成功后，设置分享数据
      window.wx.ready(() => {
        // 设置分享给朋友的数据
        window.wx.updateAppMessageShareData({
          title: shareInfo?.title || 'XBuilder',
          desc: shareInfo?.desc || 'XBuilder分享你的创意作品',
          link: location.href,
          imgUrl: location.origin + '/logo.png',
          success: function () {}
        })

        // 设置分享到朋友圈的数据
        window.wx.updateTimelineShareData({
          title: shareInfo?.title || 'XBuilder',
          desc: shareInfo?.desc || 'XBuilder分享你的创意作品',
          link: location.href,
          imgUrl: 'https://x.qiniu.com//logo.png',
          success: function () {}
        })
      })
    }
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
    supportVideo: false
  }

  shareFunction = {
    shareImage: async (image: File) => {
      return `platformUrl:${platformUrl},image:${image}`
    },
    shareVideo: async (video: File) => {
      return `platformUrl:${platformUrl},video:${video}`
    }
  }

  initShareInfo = async (shareInfo?: ShareInfo) => {
    // 抖音平台暂不支持设置分享信息
    void shareInfo
    return
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

  initShareInfo = async (shareInfo?: ShareInfo) => {
    // 小红书平台暂不支持设置分享信息
    void shareInfo
    return
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
    supportVideo: false
  }

  shareFunction = {
    shareVideo: async (video: File) => {
      return `platformUrl:${platformUrl},video:${video}`
    }
  }

  initShareInfo = async (shareInfo?: ShareInfo) => {
    // 哔哩哔哩平台暂不支持设置分享信息
    void shareInfo
    return
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

export type Disposer = () => void

export const initShareInfo = async (shareInfo?: ShareInfo): Promise<Disposer> => {
  const defaultShareInfo = shareInfo || { title: 'XBulider', desc: 'XBuilder分享你的创意作品' }
  const qq = new QQPlatform()
  const wechat = new WeChatPlatform()

  await Promise.all([qq.initShareInfo(defaultShareInfo), wechat.initShareInfo(defaultShareInfo)])

  return () => {
    // Reset to a generic default for the current page to avoid stale project ShareInfo
    qq.initShareInfo(defaultShareInfo)
    wechat.initShareInfo(defaultShareInfo)
  }
}
