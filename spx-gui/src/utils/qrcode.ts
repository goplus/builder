import QRCode from 'qrcode'

export interface QRCodeOptions {
  width?: number
  height?: number
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

export interface SharePlatform {
  id: string
  name: string
  generateShareUrl: (projectInfo: ProjectShareInfo) => string
}

export interface ProjectShareInfo {
  projectName: string
  projectUrl: string
  description?: string
  thumbnail?: string
}

/**
 * 二维码生成器类
 */
export class QRCodeGenerator {
  private defaultOptions: QRCodeOptions = {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  }

  /**
   * 生成二维码DataURL
   */
  async generateDataURL(text: string, options?: QRCodeOptions): Promise<string> {
    const mergedOptions = { ...this.defaultOptions, ...options }
    
    try {
      return await QRCode.toDataURL(text, {
        width: mergedOptions.width,
        margin: mergedOptions.margin,
        color: mergedOptions.color,
        errorCorrectionLevel: mergedOptions.errorCorrectionLevel
      })
    } catch (error) {
      console.error('生成二维码失败:', error)
      throw new Error('二维码生成失败')
    }
  }

  /**
   * 生成Canvas元素
   */
  async generateCanvas(text: string, options?: QRCodeOptions): Promise<HTMLCanvasElement> {
    const mergedOptions = { ...this.defaultOptions, ...options }
    
    try {
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, text, {
        width: mergedOptions.width,
        margin: mergedOptions.margin,
        color: mergedOptions.color,
        errorCorrectionLevel: mergedOptions.errorCorrectionLevel
      })
      return canvas
    } catch (error) {
      console.error('生成二维码Canvas失败:', error)
      throw new Error('二维码生成失败')
    }
  }
}

/**
 * 分享平台配置 - 修改为直接访问项目URL
 */
export const sharePlatforms: Record<string, SharePlatform> = {
  qq: {
    id: 'qq',
    name: 'QQ',
    generateShareUrl: (projectInfo: ProjectShareInfo) => {
      // 直接返回项目URL，可以添加来源标识
      const url = new URL(projectInfo.projectUrl)
    //   url.searchParams.set('from', 'qq')
    //   url.searchParams.set('share', 'qrcode')
      return url.toString()
    }
  },
  
  wechat: {
    id: 'wechat',
    name: '微信',
    generateShareUrl: (projectInfo: ProjectShareInfo) => {
      // 直接返回项目URL，添加微信来源标识
      const url = new URL(projectInfo.projectUrl)
      url.searchParams.set('from', 'wechat')
      url.searchParams.set('share', 'qrcode')
      return url.toString()
    }
  },

  douyin: {
    id: 'douyin',
    name: '抖音',
    generateShareUrl: (projectInfo: ProjectShareInfo) => {
      const url = new URL(projectInfo.projectUrl)
      url.searchParams.set('from', 'douyin')
      url.searchParams.set('share', 'qrcode')
      return url.toString()
    }
  },

  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    generateShareUrl: (projectInfo: ProjectShareInfo) => {
      const url = new URL(projectInfo.projectUrl)
      url.searchParams.set('from', 'xiaohongshu')
      url.searchParams.set('share', 'qrcode')
      return url.toString()
    }
  },

  bilibili: {
    id: 'bilibili',
    name: 'B站',
    generateShareUrl: (projectInfo: ProjectShareInfo) => {
      const url = new URL(projectInfo.projectUrl)
      url.searchParams.set('from', 'bilibili')
      url.searchParams.set('share', 'qrcode')
      return url.toString()
    }
  }
}

/**
 * 分享二维码生成器
 */
export class ShareQRCodeGenerator extends QRCodeGenerator {
  /**
   * 为特定平台生成分享二维码
   */
  async generatePlatformQRCode(
    platformId: string, 
    projectInfo: ProjectShareInfo, 
    options?: QRCodeOptions
  ): Promise<string> {
    const platform = sharePlatforms[platformId]
    if (!platform) {
      throw new Error(`不支持的分享平台: ${platformId}`)
    }

    // 生成带有来源标识的项目URL
    // const shareUrl = platform.generateShareUrl(projectInfo)
    const shareUrl = platform.generateShareUrl(projectInfo)
    
    return await this.generateDataURL(shareUrl, {
      ...options,
      // 为不同平台定制样式
      color: this.getPlatformColors(platformId),
    })
  }

  /**
   * 获取平台主题色
   */
  private getPlatformColors(platformId: string): { dark: string; light: string } {
    const colors = {
      qq: { dark: '#1296db', light: '#ffffff' },
      wechat: { dark: '#07c160', light: '#ffffff' },
      douyin: { dark: '#000000', light: '#ffffff' },
      xiaohongshu: { dark: '#ff2442', light: '#ffffff' },
      bilibili: { dark: '#00a1d6', light: '#ffffff' }
    }

    return colors[platformId as keyof typeof colors] || { dark: '#000000', light: '#ffffff' }
  }

  /**
   * 批量生成多个平台的二维码
   */
  async generateMultiplePlatformQRCodes(
    platformIds: string[], 
    projectInfo: ProjectShareInfo, 
    options?: QRCodeOptions
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {}
    
    const promises = platformIds.map(async (platformId) => {
      try {
        const dataUrl = await this.generatePlatformQRCode(platformId, projectInfo, options)
        results[platformId] = dataUrl
      } catch (error) {
        console.error(`生成${platformId}二维码失败:`, error)
        results[platformId] = '' // 失败时返回空字符串
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * 生成通用项目分享二维码（不带平台标识）
   */
  async generateProjectQRCode(
    projectInfo: ProjectShareInfo, 
    options?: QRCodeOptions
  ): Promise<string> {
    // 直接使用项目URL，不添加平台标识
    return await this.generateDataURL(projectInfo.projectUrl, options)
  }
}

// 导出单例实例
export const qrCodeGenerator = new QRCodeGenerator()
export const shareQRCodeGenerator = new ShareQRCodeGenerator()

// 便捷函数
export const generateQRCode = (text: string, options?: QRCodeOptions) => 
  qrCodeGenerator.generateDataURL(text, options)

export const generateShareQRCode = (platformId: string, projectInfo: ProjectShareInfo, options?: QRCodeOptions) =>
  shareQRCodeGenerator.generatePlatformQRCode(platformId, projectInfo, options)

// 新增：生成通用项目二维码的便捷函数
export const generateProjectQRCode = (projectInfo: ProjectShareInfo, options?: QRCodeOptions) =>
  shareQRCodeGenerator.generateProjectQRCode(projectInfo, options)