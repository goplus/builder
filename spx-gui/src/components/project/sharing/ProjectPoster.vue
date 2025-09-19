<script setup lang="ts">
import type { ProjectData } from '@/apis/project'
import html2canvas from 'html2canvas'
import { ref, nextTick, computed, onMounted, watch } from 'vue'
import { UIIcon } from '@/components/ui'
import logo from './logos/xbuilder-logo.svg'
import { createFileWithUniversalUrl } from '@/models/common/cloud'
import { useAsyncComputed } from '@/utils/utils'
import { getProjectPageRoute } from '@/router'
import QRCode from 'qrcode'

const props = defineProps<{
  img?: File
  projectData: ProjectData
}>()

// Handle user uploaded images
const uploadedImgUrl = ref<string | null>(null)

// Watch props.img changes and update uploadedImgUrl
watch(
  () => props.img,
  (newImg, _, onCleanup) => {
    // Create new URL
    if (newImg != null) {
      uploadedImgUrl.value = URL.createObjectURL(newImg)

      // Set up cleanup for the new URL
      onCleanup(() => {
        if (uploadedImgUrl.value) {
          URL.revokeObjectURL(uploadedImgUrl.value)
        }
      })
    } else {
      uploadedImgUrl.value = null
    }
  },
  { immediate: true }
)

// Handle project thumbnail (tolerate cancellation during effect re-runs)
const thumbnailUrl = useAsyncComputed(async (onCleanup) => {
  const thumbnail = props.projectData.thumbnail
  if (!thumbnail) return null
  try {
    const file = createFileWithUniversalUrl(thumbnail)
    return await file.url(onCleanup)
  } catch (err: unknown) {
    const msg = String(err)
    if ((err as any)?.name === 'AbortError' || msg.includes('Cancelled')) {
      return null
    }
    console.error('[Poster] thumbnail fetch error:', err)
    return null
  }
})

// Final image URL
const imgUrl = computed(() => {
  return uploadedImgUrl.value || thumbnailUrl.value || ''
})

const posterElementRef = ref<HTMLElement>()
const projectQrCanvas = ref<HTMLCanvasElement>()

// Handle project description text truncation ===========================
const truncatedDescription = computed(() => {
  if (!props.projectData.description) return ''

  const maxLength = 80 // Maximum character count
  const description = props.projectData.description.trim()

  if (description.length <= maxLength) {
    return description
  }

  // Try to truncate at sentence endings like periods, exclamation marks, question marks
  const sentenceEndings = ['。', '！', '？', '.', '!', '?']
  let lastSentenceEnd = -1

  for (const ending of sentenceEndings) {
    const index = description.lastIndexOf(ending, maxLength)
    if (index > lastSentenceEnd) {
      lastSentenceEnd = index
    }
  }

  if (lastSentenceEnd > maxLength * 0.6) {
    // If sentence ending position is within reasonable range
    return description.substring(0, lastSentenceEnd + 1)
  }

  // Otherwise truncate at space
  const lastSpace = description.lastIndexOf(' ', maxLength)
  if (lastSpace > maxLength * 0.7) {
    // If space position is within reasonable range
    return description.substring(0, lastSpace) + '...'
  }

  // Finally, truncate directly and add ellipsis
  return description.substring(0, maxLength) + '...'
})
// =============================================

// Get project URL
const getProjectUrl = (owner: string, name: string) => {
  const projectPath = getProjectPageRoute(owner, name)
  return window.location.origin + projectPath
}

// Render QR code to canvas
const drawQRCodeToCanvas = async (canvas: HTMLCanvasElement, url: string) => {
  try {
    // Get dimensions defined in CSS
    const computedStyle = window.getComputedStyle(canvas)
    const displayWidth = parseInt(computedStyle.width) || 60
    const displayHeight = parseInt(computedStyle.height) || 60

    // Calculate device pixel ratio for high-resolution display
    const devicePixelRatio = window.devicePixelRatio || 1
    const pixelRatio = Math.max(devicePixelRatio, 2) // At least 2x resolution

    // Set canvas actual pixel dimensions (high resolution)
    canvas.width = displayWidth * pixelRatio
    canvas.height = displayHeight * pixelRatio

    const ctx = canvas.getContext('2d')
    if (ctx) {
      // Set high-resolution rendering
      ctx.scale(pixelRatio, pixelRatio)

      try {
        // Use qrcode library to generate QR code
        const qrDataURL = await QRCode.toDataURL(url, {
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: displayWidth * pixelRatio,
          margin: 1
        })

        const img = new window.Image()

        // 使用 Promise 来等待图片加载完成
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            // Clear canvas
            ctx.clearRect(0, 0, displayWidth, displayHeight)

            // Calculate center position
            const imgSize = Math.min(displayWidth, displayHeight)
            const x = (displayWidth - imgSize) / 2
            const y = (displayHeight - imgSize) / 2

            // Draw QR code
            ctx.drawImage(img, x, y, imgSize, imgSize)
            resolve()
          }
          img.onerror = () => {
            console.error('Failed to load QR code image')
            reject(new Error('Failed to load QR code image'))
          }
          img.src = qrDataURL
        })
      } catch (error) {
        console.error('Failed to generate QR code:', error)
      }
    }
  } catch (error) {
    console.error('Failed to generate QR code:', error)
  }
}

// Generate QR code
const renderQRCode = async (canvas: HTMLCanvasElement, owner: string, name: string) => {
  const projectUrl = getProjectUrl(owner, name)
  await drawQRCodeToCanvas(canvas, projectUrl)
}

// Watch project info changes and regenerate QR code
watch(
  () => [projectQrCanvas.value, props.projectData.owner, props.projectData.name] as const,
  ([canvas, owner, name]) => {
    if (canvas == null || !owner || !name) return
    nextTick(() => {
      renderQRCode(canvas, owner, name)
    })
  }
)

onMounted(() => {
  const canvas = projectQrCanvas.value
  const { owner, name } = props.projectData
  if (canvas && owner && name) {
    nextTick(() => {
      renderQRCode(canvas, owner, name)
    })
  }
})

const createPoster = async (): Promise<File> => {
  if (!posterElementRef.value || !props.projectData) {
    throw new Error('Poster element not ready or project data is undefined')
  }

  await nextTick()

  const rect = posterElementRef.value.getBoundingClientRect()

  const posterCanvas = await html2canvas(posterElementRef.value, {
    width: rect.width,
    height: rect.height,
    useCORS: true,
    allowTaint: true,
    backgroundColor: 'transparent',
    scale: 1,
    logging: false
  })

  const blob = await new Promise<Blob | null>((resolve) =>
    posterCanvas.toBlob((b: Blob | null) => resolve(b), 'image/png')
  )

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
      <div class="branding-container">
        <div class="branding">
          <img :src="logo" alt="logo" class="branding-logo" style="height: 40px; vertical-align: middle" />
        </div>
        <div class="project-qrcode">
          <canvas ref="projectQrCanvas" class="project-qr-canvas"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.poster-background {
  width: 300px;
  height: auto;
  background-image: url('./posterBackground.jpg');
  background-size: cover;
  background-position: center;
  padding: 18px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  min-height: 400px;
  margin-top: 10px;
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

.branding-container {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.branding {
  display: flex;
  align-items: center;
  height: 60px;
  background: rgba(0, 0, 0, 0.1);
  padding: 12px 6px;
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
