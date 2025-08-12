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
 * 分享平台配置
 */
export const sharePlatforms: Record<string, SharePlatform> = {
  qq: {
    id: 'qq',
    name: 'QQ',
    generateShareUrl: (projectInfo: ProjectShareInfo) => {
      const title = encodeURIComponent(`【XBuilder作品】${projectInfo.projectName}`)
      const desc = encodeURIComponent(projectInfo.description || `这是我在XBuilder上创作的游戏作品《${projectInfo.projectName}》，快来体验吧！`)
      const url = encodeURIComponent(projectInfo.projectUrl)
      
      return `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${url}&title=${title}&desc=${desc}&summary=${desc}&site=XBuilder`
    }
  },
  
  wechat: {
    id: 'wechat',
    name: '微信',
    generateShareUrl: (projectInfo: ProjectShareInfo) => {
      // 微信通常直接分享项目URL，配合微信JS-SDK
      return projectInfo.projectUrl
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
}

// 导出单例实例
export const qrCodeGenerator = new QRCodeGenerator()
export const shareQRCodeGenerator = new ShareQRCodeGenerator()

// 便捷函数
export const generateQRCode = (text: string, options?: QRCodeOptions) => 
  qrCodeGenerator.generateDataURL(text, options)

export const generateShareQRCode = (platformId: string, projectInfo: ProjectShareInfo, options?: QRCodeOptions) =>
  shareQRCodeGenerator.generatePlatformQRCode(platformId, projectInfo, options)