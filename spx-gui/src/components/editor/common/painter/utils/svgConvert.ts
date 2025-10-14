/**
 * 将 SVG 转换为 PNG 格式的 File 对象
 * @param imgSrc - SVG 的 blob URL
 * @param fileName - 输出文件名（默认为 'image.png'）
 * @param scale - 缩放比例（默认为 1，可以设置更高的值以获得更高分辨率）
 * @returns Promise<File> - PNG 格式的 File 对象
 */
export async function svgToPng(imgSrc: string, fileName: string = 'image.png', scale: number = 1): Promise<File> {
  return new Promise((resolve, reject) => {
    // 创建一个 Image 对象来加载 SVG
    const img = new Image()

    // 设置跨域属性（如果需要）
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        // 创建 canvas 元素
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('无法获取 canvas 上下文'))
          return
        }

        // 设置 canvas 尺寸（考虑缩放比例）
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        // 如果设置了缩放，需要缩放上下文
        if (scale !== 1) {
          ctx.scale(scale, scale)
        }

        // 绘制图像到 canvas
        ctx.drawImage(img, 0, 0)

        // 将 canvas 转换为 blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('转换为 blob 失败'))
              return
            }

            // 将 blob 转换为 File 对象
            const file = new File([blob], fileName, {
              type: 'image/png',
              lastModified: Date.now()
            })

            resolve(file)
          },
          'image/png',
          1.0 // PNG 质量（PNG 是无损格式，所以这个参数实际上不影响质量）
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('加载 SVG 图像失败'))
    }

    // 开始加载图像
    img.src = imgSrc
  })
}

/**
 * 将 SVG 字符串转换为 PNG 格式的 File 对象
 * @param svgString - SVG 字符串内容
 * @param fileName - 输出文件名（默认为 'image.png'）
 * @param scale - 缩放比例（默认为 1）
 * @returns Promise<File> - PNG 格式的 File 对象
 */
export async function svgStringToPng(
  svgString: string,
  fileName: string = 'image.png',
  scale: number = 1
): Promise<File> {
  // 将 SVG 字符串转换为 blob URL
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const file = await svgToPng(url, fileName, scale)
    return file
  } finally {
    // 清理 blob URL
    URL.revokeObjectURL(url)
  }
}
