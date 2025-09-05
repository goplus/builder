<script setup lang="ts">
// expose、defineExpose需要在setup内执行
import type { ProjectData } from '@/apis/project'
import html2canvas from 'html2canvas'
import { ref, nextTick, computed, onMounted, watch } from 'vue'
import { UIIcon } from '@/components/ui'
import logo from './logos/XBuilderLogo.svg'
import { universalUrlToWebUrl } from '@/models/common/cloud'
import { useExternalUrl } from '@/utils/utils'
import QRCode from 'qrcode'

const props = defineProps<{
  img?: File
  projectData: ProjectData
}>()

const projectUrlQRCode = computed(
  () => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}`
)

// 处理用户上传的图片
const uploadedImgUrl = computed(() => {
  if (props.img && props.img instanceof File) {
    return URL.createObjectURL(props.img)
  }
  return null
})

// 处理项目缩略图
const thumbnailWebUrl = ref<string | null>(null)
watch(
  () => props.projectData.thumbnail,
  async (thumbnail) => {
    if (thumbnail) {
      try {
        // 将 kodo:// URL 转换为可用的 HTTP URL
        const webUrl = await universalUrlToWebUrl(thumbnail)
        thumbnailWebUrl.value = webUrl
      } catch (error) {
        console.error('转换缩略图URL失败:', error)
        thumbnailWebUrl.value = null
      }
    } else {
      thumbnailWebUrl.value = null
    }
  },
  { immediate: true }
)

// 使用 useExternalUrl 处理跨域图片
const safeImgUrl = useExternalUrl(thumbnailWebUrl)

// 最终的图片URL
const imgUrl = computed(() => {
  return uploadedImgUrl.value || safeImgUrl.value || ''
})

const posterElementRef = ref<HTMLElement>()

const projectQrCanvas = ref<HTMLCanvasElement>()

// 处理项目描述文本截断 ===========================
const truncatedDescription = computed(() => {
  if (!props.projectData.description) return ''

  const maxLength = 80 // 最大字符数
  const description = props.projectData.description.trim()

  if (description.length <= maxLength) {
    return description
  }

  // 尝试在句号、感叹号、问号处截断
  const sentenceEndings = ['。', '！', '？', '.', '!', '?']
  let lastSentenceEnd = -1

  for (const ending of sentenceEndings) {
    const index = description.lastIndexOf(ending, maxLength)
    if (index > lastSentenceEnd) {
      lastSentenceEnd = index
    }
  }

  if (lastSentenceEnd > maxLength * 0.6) {
    // 如果句号位置在合理范围内
    return description.substring(0, lastSentenceEnd + 1)
  }

  // 否则在空格处截断
  const lastSpace = description.lastIndexOf(' ', maxLength)
  if (lastSpace > maxLength * 0.7) {
    // 如果空格位置在合理范围内
    return description.substring(0, lastSpace) + '...'
  }

  // 最后直接截断并添加省略号
  return description.substring(0, maxLength) + '...'
})
// =============================================

// 获取当前项目URL
const getCurrentProjectUrl = () => {
  return window.location.origin + window.location.pathname
}

// 渲染二维码到canvas
const drawQRCodeToCanvas = async (canvas: HTMLCanvasElement, url: string) => {
  if (!canvas) return

  try {
    // 获取CSS中定义的尺寸
    const computedStyle = window.getComputedStyle(canvas)
    const displayWidth = parseInt(computedStyle.width) || 60
    const displayHeight = parseInt(computedStyle.height) || 60

    // 计算设备像素比，确保高分辨率显示
    const devicePixelRatio = window.devicePixelRatio || 1
    const pixelRatio = Math.max(devicePixelRatio, 2) // 至少2倍分辨率

    // 设置canvas的实际像素尺寸（高分辨率）
    canvas.width = displayWidth * pixelRatio
    canvas.height = displayHeight * pixelRatio

    const ctx = canvas.getContext('2d')
    if (ctx) {
      // 设置高分辨率渲染
      ctx.scale(pixelRatio, pixelRatio)

      try {
        // 使用 qrcode 库生成二维码
        const qrDataURL = await QRCode.toDataURL(url, {
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: displayWidth * pixelRatio,
          margin: 1
        })

        const img = new window.Image()
        img.onload = () => {
          // 清除canvas
          ctx.clearRect(0, 0, displayWidth, displayHeight)

          // 计算居中位置
          const imgSize = Math.min(displayWidth, displayHeight)
          const x = (displayWidth - imgSize) / 2
          const y = (displayHeight - imgSize) / 2

          // 绘制二维码
          ctx.drawImage(img, x, y, imgSize, imgSize)
        }
        img.onerror = () => {
          console.error('Failed to load QR code image')
        }
        img.src = qrDataURL
      } catch (error) {
        console.error('生成二维码失败:', error)
      }
    }
  } catch (error) {
    console.error('生成二维码失败:', error)
  }
}

// 生成二维码
const renderQRCode = async () => {
  if (projectQrCanvas.value && projectUrlQRCode.value) {
    const currentUrl = getCurrentProjectUrl()
    await drawQRCodeToCanvas(projectQrCanvas.value, currentUrl)
  }
}

// 监听属性变化，重新生成二维码
watch(
  () => [props.projectData.name],
  () => {
    nextTick(() => {
      renderQRCode()
    })
  }
)

onMounted(() => {
  if (projectQrCanvas.value) {
    nextTick(() => {
      renderQRCode()
    })
  }
})

const createPoster = async (): Promise<File> => {
  if (!posterElementRef.value || !props.projectData) {
    throw new Error('Poster element not ready or project data is undefined')
  }

  await nextTick() // 确保 DOM 已经更新

  const canvas = await html2canvas(posterElementRef.value, {
    width: 800,
    height: 1000
  })

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b: Blob | null) => resolve(b), 'image/png'))

  if (!blob) throw new Error('Failed to generate poster')

  return new File([blob], `${props.projectData.name}-poster.png`, { type: 'image/png' })
}

defineExpose({
  createPoster
})
</script>

<template>
  <div ref="posterElementRef" class="poster-background">
    <div class="screenshot-area">
      <img v-if="imgUrl" :src="imgUrl" :alt="props.projectData.name" class="screenshot-image" />
      <div v-else class="screenshot-placeholder">
        <UIIcon type="file" />
        <span>{{ $t({ en: 'No Image', zh: '暂无截屏' }) }}</span>
      </div>
    </div>
    <div class="poster-decoration">
      <div class="project-info">
        <div class="game-title">{{ props.projectData.name }}</div>
        <div v-if="props.projectData.owner" class="creator-info">
          <UIIcon type="statePublic" />
          <span>{{ $t({ en: 'Created by', zh: '创作者' }) }}: {{ props.projectData.owner }}</span>
        </div>
        <div v-if="truncatedDescription" class="project-description">
          <UIIcon type="info" />
          <span>{{ truncatedDescription }}</span>
        </div>
        <div class="project-stats">
          <div v-if="props.projectData.viewCount" class="stat-item">
            <UIIcon type="eye" />
            <span>{{ props.projectData.viewCount }}</span>
          </div>
          <div v-if="props.projectData.likeCount" class="stat-item">
            <UIIcon type="heart" />
            <span>{{ props.projectData.likeCount }}</span>
          </div>
          <div v-if="props.projectData.remixCount" class="stat-item">
            <UIIcon type="remix" />
            <span>{{ props.projectData.remixCount }}</span>
          </div>
        </div>
      </div>
      <div style="display: flex; align-items: flex-start; gap: 16px">
        <div class="branding">
          <img :src="logo" alt="logo" class="branding-logo" style="height: 40px; vertical-align: middle" />
        </div>
        <div v-if="projectUrlQRCode" class="project-qrcode">
          <canvas ref="projectQrCanvas" class="project-qr-canvas"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.poster-background {
  width: 300px;
  height: 100%;
  background-image: url('./posterBackground.jpg');
  background-size: cover;
  background-position: center;
  padding: 32px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  /* box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15); */
  transition: all 0.3s ease;
  max-height: 500px;
}

.screenshot-area {
  flex: 1;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 24px;
  position: relative;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(0, 0, 0, 0.02) 100%);
    pointer-events: none;
  }
}

.screenshot-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.screenshot-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--ui-color-hint-2);

  :deep(.ui-icon) {
    width: 48px;
    height: 48px;
  }
}

.poster-decoration {
  color: #333333;
  text-align: left;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 1;
}

.project-info {
  flex: 1;
}

.game-title {
  font-size: 19px;
  font-weight: 800;
  margin-bottom: 8px;
  line-height: 1.3;
  text-shadow: 0 1px 3px rgba(255, 255, 255, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  letter-spacing: -0.02em;
  color: #1a1a1a;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  margin-bottom: 8px;
  opacity: 0.9;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  color: #2d2d2d;

  :deep(.ui-icon) {
    width: 14px;
    height: 14px;
    opacity: 0.8;
  }

  span {
    font-weight: 500;
    letter-spacing: -0.01em;
  }
}

.project-description {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 12px;
  opacity: 0.85;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  line-height: 1.4;
  color: #404040;

  :deep(.ui-icon) {
    width: 14px;
    height: 14px;
    opacity: 0.7;
    margin-top: 1px;
    flex-shrink: 0;
  }

  span {
    font-weight: 400;
    letter-spacing: -0.01em;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
}

.project-stats {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  opacity: 0.98;
  background: rgba(0, 0, 0, 0.1);
  padding: 8px 12px;
  border-radius: 16px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  color: #2d2d2d;

  &:hover {
    background: rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  :deep(.ui-icon) {
    width: 14px;
    height: 14px;
    opacity: 0.95;
  }

  span {
    font-weight: 700;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
    letter-spacing: -0.01em;
  }
}

.branding {
  display: flex;
  align-items: center;
  height: 60px;
  background: rgba(0, 0, 0, 0.1);
  padding: 12px 20px;
  border-radius: 24px;
  backdrop-filter: blur(4px);
  box-sizing: border-box;
  transition: all 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.1);

  &:hover {
    background: rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
}

.project-qrcode {
  display: flex;
  align-items: center;
  height: 60px;
  min-width: 60px;
}

.project-qr-canvas {
  width: 60px;
  height: 60px;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}
</style>
