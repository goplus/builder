import { getWeChatJSSDKConfig } from '@/apis/wechat'
import { h, type Component, ref, onMounted } from 'vue'
import QRCode from 'qrcode'
import ManualShareGuide from './ManualShareGuide.vue'
import type { LocaleMessage } from '@/utils/i18n/index'
/**
 * 社交平台配置
 */
export type BasicInfo = {
  /** 平台标识符名称 */
  name: string
  /** 本地化显示标签 */
  label: LocaleMessage
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
  /** 分享项目页面方法 - 返回二维码组件 */
  shareURL?: (url: string) => Promise<Component>
  /** 分享海报方法 */
  shareImage?: (image: File) => Component
  /** 分享视频方法 */
  shareVideo?: (video: File) => Component
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
 * 常用跳转链接（按需使用）
 */
const JUMP_LINKS = {
  bilibiliVideoPC: 'https://member.bilibili.com/platform/upload/video/frame',
  douyinMobile: 'https://www.douyin.com/'
}

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
    supportVideo: true
  }

  shareFunction = {
    shareURL: async (url: string) => {
      return createQRCodeComponent(url, this.basicInfo.color)
    },
    shareImage: (image: File) =>
      createImageManualShareGuide({
        platform: this.basicInfo.label,
        image,
        filename: 'xbuilder-poster.png',
        title: { en: 'How to share to QQ', zh: '如何分享到QQ' },
        steps: [
          {
            title: { en: 'Download poster', zh: '下载海报' },
            desc: { en: 'Save the poster to your phone', zh: '将海报保存到手机' }
          },
          {
            title: { en: 'Open QQ', zh: '打开QQ' },
            desc: { en: 'Create a new post or chat', zh: '进入聊天或空间说说' }
          },
          {
            title: { en: 'Upload & share', zh: '上传并分享' },
            desc: { en: 'Select the downloaded poster', zh: '选择刚下载的海报进行分享' }
          }
        ]
      }),
    shareVideo: (video: File) =>
      createVideoManualShareGuide({
        platform: this.basicInfo.label,
        video,
        filename: 'xbuilder-video.mp4',
        title: { en: 'How to share video to QQ', zh: '如何将视频分享到QQ' },
        steps: [
          {
            title: { en: 'Download video', zh: '下载视频' },
            desc: { en: 'Save the video to your phone', zh: '将视频保存到手机' }
          },
          {
            title: { en: 'Open QQ', zh: '打开QQ' },
            desc: { en: 'Create a new post or chat', zh: '进入聊天或空间说说' }
          },
          {
            title: { en: 'Upload & share', zh: '上传并分享' },
            desc: { en: 'Select the downloaded video', zh: '选择刚下载的视频进行分享' }
          }
        ]
      })
  }

  async initShareInfo(shareInfo?: ShareInfo) {
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
    supportVideo: true
  }

  shareFunction = {
    shareURL: async (url: string) => {
      // const projectTitle = extractOwnerAndName(url)
      // 可以在这里添加微信分享逻辑，使用 projectTitle
      return createQRCodeComponent(url, this.basicInfo.color)
    },

    shareImage: (image: File) =>
      createImageManualShareGuide({
        platform: this.basicInfo.label,
        image,
        filename: 'xbuilder-poster.png',
        title: { en: 'How to share to WeChat', zh: '如何分享到微信' },
        steps: [
          {
            title: { en: 'Download poster', zh: '下载海报' },
            desc: { en: 'Save the poster to your phone', zh: '将海报保存到手机相册' }
          },
          {
            title: { en: 'Open WeChat', zh: '打开微信' },
            desc: { en: 'Open a chat or Moments', zh: '进入聊天或朋友圈发布' }
          },
          {
            title: { en: 'Upload & share', zh: '上传并分享' },
            desc: { en: 'Select the downloaded poster', zh: '选择刚保存的海报进行分享' }
          }
        ]
      }),
    shareVideo: (video: File) =>
      createVideoManualShareGuide({
        platform: this.basicInfo.label,
        video,
        filename: 'xbuilder-video.mp4',
        title: { en: 'How to share video to WeChat', zh: '如何将视频分享到微信' },
        steps: [
          {
            title: { en: 'Download video', zh: '下载视频' },
            desc: { en: 'Save the video to your phone', zh: '将视频保存到手机相册' }
          },
          {
            title: { en: 'Open WeChat', zh: '打开微信' },
            desc: { en: 'Open a chat or Moments', zh: '进入聊天或朋友圈发布' }
          },
          {
            title: { en: 'Upload & share', zh: '上传并分享' },
            desc: { en: 'Select the downloaded video', zh: '选择刚保存的视频进行分享' }
          }
        ]
      })
  }

  async initShareInfo(shareInfo?: ShareInfo) {
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
          imgUrl: location.origin + '/logo.png',
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
    // 手机端跳转 URL（通过组件引导）
    supportVideo: true
  }

  shareFunction = {
    shareImage: (image: File) =>
      createImageManualShareGuide({
        platform: this.basicInfo.label,
        image,
        filename: 'xbuilder-poster.png',
        title: { en: 'How to share to Douyin', zh: '如何分享到抖音' },
        steps: [
          {
            title: { en: 'Download poster', zh: '下载海报' },
            desc: { en: 'Save the poster to your phone', zh: '将海报保存到手机相册' }
          },
          { title: { en: 'Open Douyin', zh: '打开抖音' }, desc: { en: 'Tap "+" to create', zh: '点击"+"创建' } },
          {
            title: { en: 'Upload & publish', zh: '上传发布' },
            desc: { en: 'Select downloaded poster', zh: '选择刚下载的海报并发布' }
          }
        ]
      }),
    shareVideo: (video: File) =>
      createJumpLinkComponent({
        title: { en: 'Open Douyin to share video', zh: '打开抖音进行视频分享' },
        url: JUMP_LINKS.douyinMobile,
        openInNewTab: false,
        video: video
      })
  }

  async initShareInfo(shareInfo?: ShareInfo) {
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
    supportVideo: true
  }

  shareFunction = {
    shareImage: (image: File) =>
      createImageManualShareGuide({
        platform: this.basicInfo.label,
        image,
        filename: 'xbuilder-poster.png',
        title: { en: 'How to share to Xiaohongshu', zh: '如何分享到小红书' },
        steps: [
          {
            title: { en: 'Download poster', zh: '下载海报' },
            desc: { en: 'Save the poster to your phone', zh: '将海报保存到手机相册' }
          },
          {
            title: { en: 'Open Xiaohongshu', zh: '打开小红书' },
            desc: { en: 'Tap "+" to create a note', zh: '点击"+"新建笔记' }
          },
          {
            title: { en: 'Upload & publish', zh: '上传发布' },
            desc: { en: 'Select downloaded poster and publish', zh: '选择刚下载的海报并发布' }
          }
        ]
      }),
    shareVideo: (video: File) =>
      createVideoManualShareGuide({
        platform: this.basicInfo.label,
        video,
        filename: 'xbuilder-video.mp4',
        title: { en: 'How to share to Xiaohongshu', zh: '如何分享到小红书' },
        steps: [
          {
            title: { en: 'Download video', zh: '下载视频' },
            desc: { en: 'Save the video to your phone', zh: '将视频保存到手机相册' }
          },
          {
            title: { en: 'Open Xiaohongshu', zh: '打开小红书' },
            desc: { en: 'Tap "+" to create a note', zh: '点击"+"新建笔记' }
          },
          {
            title: { en: 'Upload & publish', zh: '上传发布' },
            desc: { en: 'Select downloaded video and publish', zh: '选择刚下载的视频并发布' }
          }
        ]
      })
  }

  async initShareInfo(shareInfo?: ShareInfo) {
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
    // PC 端跳转 URL 到 Bilibili 投稿页
    supportURL: false,
    supportImage: true,
    supportVideo: true
  }

  shareFunction = {
    // shareURL 用于生成二维码时跳转到B站投稿页（PC端）
    shareURL: async (url: string) => {
      return createQRCodeComponent(url, this.basicInfo.color)
    },
    // B站的海报以手动上传为主
    shareImage: (image: File) =>
      createImageManualShareGuide({
        platform: this.basicInfo.label,
        image,
        filename: 'xbuilder-poster.png',
        title: { en: 'How to share to Bilibili', zh: '如何分享到B站' },
        steps: [
          {
            title: { en: 'Download poster', zh: '下载海报' },
            desc: { en: 'Save the poster to your PC', zh: '将海报保存到电脑' }
          },
          {
            title: { en: 'Open Bilibili', zh: '打开B站' },
            desc: { en: 'Go to the posting/upload page', zh: '进入发布/投稿页面' }
          },
          {
            title: { en: 'Upload & publish', zh: '上传发布' },
            desc: { en: 'Select the downloaded poster', zh: '选择刚下载的海报进行发布' }
          }
        ]
      }),
    // shareVideo 返回一个"打开B站投稿页"的组件
    shareVideo: (video: File) => {
      // 这个是 vue 的 functional component 写法，详见 https://vuejs.org/guide/extras/render-function#functional-components
      return () =>
        h(ManualShareGuide, {
          platform: this.basicInfo.label,
          title: { en: 'Open Bilibili upload page', zh: '打开B站投稿页面' },
          steps: [
            {
              title: { en: 'Download video', zh: '下载视频' },
              desc: { en: 'Save the video to your PC', zh: '将视频保存到电脑' }
            },
            {
              title: { en: 'Open Bilibili', zh: '打开B站' },
              desc: { en: 'Go to the upload page', zh: '进入投稿页面' }
            },
            {
              title: { en: 'Upload & publish', zh: '上传发布' },
              desc: { en: 'Select the downloaded video and publish', zh: '选择刚下载的视频进行发布' }
            }
          ],
          defaultButtonLabel: { en: 'Download video', zh: '下载视频' },
          onDownload: createBlobDownloadHandler(video, 'xbuilder-video.mp4')
        })
    }
  }

  async initShareInfo(shareInfo?: ShareInfo) {
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

/**
 * 内部复用：通用文件下载逻辑（File/Blob 均可）
 */
function createBlobDownloadHandler(blob: Blob, filename: string): () => void {
  return () => {
    try {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download blob', err)
    }
  }
}

/**
 * 平台自定义：创建"下载图片并手动上传"的引导组件
 */
function createImageManualShareGuide(options: {
  platform: LocaleMessage
  image: File
  filename?: string | undefined
  title: { en: string; zh: string }
  steps: Array<{ title: { en: string; zh: string }; desc: { en: string; zh: string } }>
  buttonText?: { en: string; zh: string }
}): Component {
  const { platform, image, filename, title, steps, buttonText } = options
  return function ImageManualShareGuide() {
    return h(ManualShareGuide, {
      platform,
      title,
      steps,
      buttonText,
      defaultButtonLabel: { zh: '下载图片', en: 'Download image' },
      onDownload: createBlobDownloadHandler(image, filename || 'xbuilder-poster.png')
    })
  }
}

/**
 * 平台自定义：创建"下载视频并手动上传"的引导组件（不依赖 SupportedTips）
 */
function createVideoManualShareGuide(options: {
  platform: LocaleMessage
  video: File
  filename?: string | undefined
  title: { en: string; zh: string }
  steps: Array<{ title: { en: string; zh: string }; desc: { en: string; zh: string } }>
  buttonText?: { en: string; zh: string }
}): Component {
  const { platform, video, filename, title, steps, buttonText } = options
  return function VideoManualShareGuide() {
    return h(ManualShareGuide, {
      platform,
      title,
      steps,
      buttonText,
      defaultButtonLabel: { zh: '下载视频', en: 'Download video' },
      onDownload: createBlobDownloadHandler(video, filename || 'xbuilder-video.mp4')
    })
  }
}

/**
 * 创建二维码分享组件
 */
function createQRCodeComponent(url: string, platformColor: string): Component {
  return {
    name: 'QRCodeShare',
    setup() {
      const qrData = ref<string | null>(null)

      onMounted(async () => {
        qrData.value = await QRCode.toDataURL(url, {
          color: { dark: platformColor, light: '#FFFFFF' },
          width: 120,
          margin: 1
        })
      })

      const container = 'display:flex;flex-direction:column;gap:8px;align-items:center'

      return () =>
        h('div', { style: container }, [
          qrData.value ? h('img', { src: qrData.value, alt: 'QR Code', width: 120, height: 120 }) : h('div', '...')
        ])
    }
  } as unknown as Component
}

/**
 * 创建"跳转到平台"的引导组件（用于需要直接打开URL的情况）
 */
function createJumpLinkComponent(options: {
  title: { en: string; zh: string }
  url: string
  openInNewTab?: boolean
  video: File
}): Component {
  const { title, url, openInNewTab, video } = options
  return {
    name: 'JumpLinkGuide',
    setup() {
      // Touch video to avoid unused variable warning until full implementation lands
      const videoName = video.name
      void videoName
      const qrData = ref<string | null>(null)

      onMounted(async () => {
        qrData.value = await QRCode.toDataURL(url, {
          color: { dark: '#000000', light: '#FFFFFF' },
          width: 120,
          margin: 1
        })
      })

      function handleOpen() {
        if (openInNewTab === false) {
          location.href = url
        } else {
          window.open(url, '_blank')
        }
      }

      const container = 'display:flex;flex-direction:column;gap:8px;align-items:center'
      const titleStyle = 'font-size:14px;color:var(--ui-color-text-primary);text-align:center'
      const btnStyle =
        'padding:8px 12px;border:1px solid var(--ui-color-primary);color:var(--ui-color-primary);background:transparent;border-radius:6px;cursor:pointer'

      return () =>
        h('div', { style: container }, [
          h('div', { style: titleStyle }, `${title.zh} / ${title.en}`),
          qrData.value ? h('img', { src: qrData.value, alt: 'QR Code', width: 120, height: 120 }) : h('div', '...'),
          h('button', { style: btnStyle, onClick: handleOpen }, '打开 / Open')
        ])
    }
  } as unknown as Component
}
