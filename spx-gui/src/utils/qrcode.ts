import * as QRCode from 'qrcode'
import { type SocialPlatform } from '@/components/project/SharePlatform.vue'

export interface QRCodeOptions {
  width?: number
  height?: number
  margin?: number
  // 优先使用 color；如果未提供且提供了 platform，则根据平台映射生成
  color?: {
    dark?: string
    light?: string
  }
  platform?: SocialPlatform
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
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

  private resolveColor(options?: QRCodeOptions): { dark?: string; light?: string } | undefined {
    if (!options) return this.defaultOptions.color
    if (options.color) return options.color
    if (options.platform) {
      const dark = options.platform.color || this.defaultOptions.color!.dark
      return { dark, light: '#ffffff' }
    }
    return this.defaultOptions.color
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
        color: this.resolveColor(options),
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
        color: this.resolveColor(options),
        errorCorrectionLevel: mergedOptions.errorCorrectionLevel
      })
      return canvas
    } catch (error) {
      console.error('生成二维码Canvas失败:', error)
      throw new Error('二维码生成失败')
    }
  }
}

// 导出单例实例
export const qrCodeGenerator = new QRCodeGenerator()

// 便捷函数：仅负责将给定文本/链接生成二维码
export const generateQRCode = (text: string, options?: QRCodeOptions) => 
  qrCodeGenerator.generateDataURL(text, options)

// 便捷函数：根据平台名返回二维码颜色（深色/浅色）
export const getPlatformQrColor = (platform?: string) => {
  const generator = qrCodeGenerator as any
  const map = generator.platformDarkColorMap as Record<string, string>
  const dark = (platform && map[platform]) || '#000000'
  return { dark, light: '#ffffff' }
}