<template>
  <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
    <div class="screenshot-share-modal" @click.stop>
      <div class="modal-header">
        <h2>{{ $t({ en: 'Share Screenshot', zh: '分享截图' }) }}</h2>
        <button class="close-btn" @click="handleClose">
          <UIIcon type="close" />
        </button>
      </div>
      
      <div class="modal-content">
        <!-- 上半部分：左边海报，右边二维码和下载 -->
        <div class="top-content">
          <!-- 左侧：海报样式截图 -->
          <div class="poster-section">
            <div class="poster-container">
              <div class="poster-background">
                <!-- 截图显示区域 -->
                <div class="screenshot-area">
                  <img v-if="screenshotDataUrl" :src="screenshotDataUrl" alt="Screenshot" class="screenshot-image" />
                  <div v-else class="screenshot-placeholder">
                    <UIIcon type="file" />
                    <span>{{ $t({ en: 'No screenshot', zh: '暂无截图' }) }}</span>
                  </div>
                </div>
                
                <!-- 海报装饰元素 -->
                <div class="poster-decoration">
                  <div class="project-info">
                    <div class="game-title">{{ projectName }}</div>
                    <div class="project-stats" v-if="formattedStats">
                      <div class="stat-item" v-if="formattedStats.viewCount">
                        <UIIcon type="eye" />
                        <span>{{ $t(formattedStats.viewCount) }}</span>
                      </div>
                      <div class="stat-item" v-if="formattedStats.likeCount">
                        <UIIcon type="heart" />
                        <span>{{ $t(formattedStats.likeCount) }}</span>
                      </div>
                      <div class="stat-item" v-if="formattedStats.remixCount">
                        <UIIcon type="remix" />
                        <span>{{ $t(formattedStats.remixCount) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="branding">Made with Xbuilder</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 右侧：二维码和下载 -->
          <div class="qr-section">
            <!-- 二维码区域 -->
            <div class="qr-container">
              <div class="qr-code-area">
                <canvas ref="qrCanvas" class="qr-canvas"></canvas>
              </div>
              <div class="qr-description">{{ $t({ en: 'Scan QR code to share on platform', zh: '用对应平台进行扫码分享' }) }}</div>
            </div>
            
            <!-- 一键下载按钮 -->
            <div class="download-section">
              <UIButton
                type="primary"
                size="large"
                icon="arrowDown"
                :loading="isDownloading"
                @click="handleDownload"
              >
                {{ $t({ en: 'One-click Download', zh: '一键下载' }) }}
              </UIButton>
            </div>
          </div>
        </div>
        
        <!-- 下半部分：平台选择器 -->
        <div class="bottom-content">
          <div class="platform-selector">
            <div class="platform-title">{{ $t({ en: 'Share Method', zh: '分享方式' }) }}</div>
            <div class="platform-buttons">
              <button
                v-for="platform in platforms"
                :key="platform.id"
                :class="['platform-btn', { active: selectedPlatform.id === platform.id }]"
                @click="selectPlatform(platform)"
              >
                <div class="platform-icon" :style="{ backgroundColor: platform.color }">
                  <span>{{ platform.icon }}</span>
                </div>
                <span class="platform-name">{{ platform.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
// import QRCode from 'qrcode' // 暂时注释掉，稍后添加依赖
import { UIButton, UIIcon } from '@/components/ui'
import { humanizeCount } from '@/utils/utils'

interface Platform {
  id: string
  name: string
  icon: string
  color: string
  shareUrl: string
}

interface ProjectStats {
  viewCount?: number
  likeCount?: number
  remixCount?: number
}

const props = defineProps<{
  visible: boolean
  screenshotDataUrl?: string
  projectName?: string
  projectStats?: ProjectStats
}>()

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  close: []
}>()

const visible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const qrCanvas = ref<HTMLCanvasElement>()
const isDownloading = ref(false)

// 平台配置
const platforms: Platform[] = [
  {
    id: 'qq',
    name: 'QQ',
    icon: '🐧',
    color: '#12B7F5',
    shareUrl: 'https://qzone.qq.com'
  },
  {
    id: 'wechat',
    name: '微信',
    icon: '💬',
    color: '#09BB07',
    shareUrl: 'https://weixin.qq.com'
  },
  {
    id: 'douyin',
    name: '抖音',
    icon: '🎵',
    color: '#FE2C55',
    shareUrl: 'https://www.douyin.com'
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    icon: '📖',
    color: '#FF2442',
    shareUrl: 'https://www.xiaohongshu.com'
  },
  {
    id: 'bilibili',
    name: 'B站',
    icon: '📺',
    color: '#00A1D6',
    shareUrl: 'https://www.bilibili.com'
  }
]

const selectedPlatform = ref<Platform>(platforms[0])

// 计算格式化的统计数据
const formattedStats = computed(() => {
  if (!props.projectStats) return null
  
  return {
    viewCount: props.projectStats.viewCount ? humanizeCount(props.projectStats.viewCount) : null,
    likeCount: props.projectStats.likeCount ? humanizeCount(props.projectStats.likeCount) : null,
    remixCount: props.projectStats.remixCount ? humanizeCount(props.projectStats.remixCount) : null
  }
})

function selectPlatform(platform: Platform) {
  selectedPlatform.value = platform
  generateQRCode()
}

async function generateQRCode() {
  if (!qrCanvas.value) return
  
  try {
    const canvas = qrCanvas.value
    const shareText = `我在Xbuilder制作了一个游戏${props.projectName ? ` "${props.projectName}"` : ''}，快来看看吧！`
    const shareUrl = `${selectedPlatform.value.shareUrl}?text=${encodeURIComponent(shareText)}`
    
    // 临时显示平台信息，等添加qrcode库后再生成真正的二维码
    const ctx = canvas.getContext('2d')
    if (ctx) {
      canvas.width = 150
      canvas.height = 150
      
      // 背景
      ctx.fillStyle = '#f8f9fa'
      ctx.fillRect(0, 0, 150, 150)
      
      // 边框
      ctx.strokeStyle = '#dee2e6'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, 148, 148)
      
      // 平台图标背景
      ctx.fillStyle = selectedPlatform.value.color
      ctx.fillRect(40, 40, 70, 70)
      
      // 平台图标
      ctx.fillStyle = 'white'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(selectedPlatform.value.icon, 75, 75)
      
      // 平台名称
      ctx.fillStyle = '#495057'
      ctx.font = '12px Arial'
      ctx.fillText(selectedPlatform.value.name, 75, 125)
      
      // 二维码提示
      ctx.font = '10px Arial'
      ctx.fillStyle = '#6c757d'
      ctx.fillText('扫码分享', 75, 140)
    }
    
    // 等添加QRCode库后使用：
    // await QRCode.toCanvas(canvas, shareUrl, {
    //   width: 150,
    //   margin: 2,
    //   color: {
    //     dark: '#000000',
    //     light: '#ffffff'
    //   }
    // })
  } catch (error) {
    console.error('生成二维码失败:', error)
  }
}

async function handleDownload() {
  isDownloading.value = true
  
  try {
    // 这里可以使用html2canvas将整个海报区域转换为图片进行下载
    // 或者创建一个包含截图和二维码的合成图片
    const link = document.createElement('a')
    
    if (props.screenshotDataUrl) {
      link.href = props.screenshotDataUrl
      link.download = `${props.projectName || 'game'}-screenshot.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  } catch (error) {
    console.error('下载失败:', error)
  } finally {
    isDownloading.value = false
  }
}

function handleClose() {
  emit('close')
}

function handleOverlayClick() {
  emit('close')
}

// 监听弹窗显示状态，显示时生成二维码
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    nextTick(() => {
      generateQRCode()
    })
  }
})

onMounted(() => {
  if (props.visible) {
    generateQRCode()
  }
})
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

.screenshot-share-modal {
  width: 90%;
  max-width: 640px;
  min-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: slideInScale 0.3s ease-out;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@keyframes slideInScale {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: var(--ui-color-title);
    text-align: center;
    flex: 1;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--ui-color-hint-2);
  transition: all 0.25s ease;
  position: relative;
  
  &:hover {
    background: var(--ui-color-grey-hover);
    color: var(--ui-color-text);
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  :deep(.ui-icon) {
    width: 18px;
    height: 18px;
  }
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 32px;
  flex: 1;
  min-height: 0;
  align-items: center;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
}

.top-content {
  display: flex;
  gap: 32px;
  flex: 1;
  min-height: 0;
  width: 100%;
  justify-content: center;
  align-items: flex-start;
  padding: 8px;
}

.poster-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.bottom-content {
  flex: 0 0 auto;
  padding-top: 0px;
  width: 100%;
  display: flex;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  margin: 0 -32px -32px -32px;
  padding: 16px 32px 32px 32px;
  border-radius: 0 0 16px 16px;
}

.poster-container {
  width: 100%;
  max-width: 260px;
  aspect-ratio: 3/4;
  position: relative;
  transition: all 0.3s ease;
  
  &:hover .poster-background {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  }
}

.poster-background {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 50%);
    pointer-events: none;
  }
  
  &::after {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent 49%, rgba(255, 255, 255, 0.03) 50%, transparent 51%);
    animation: shimmer 3s ease-in-out infinite;
    pointer-events: none;
  }
}

@keyframes shimmer {
  0%, 100% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  50% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

.screenshot-area {
  flex: 1;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 20px;
  position: relative;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1;
  
  &::before {
    content: "";
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
  color: white;
  text-align: left;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1;
}

.project-info {
  flex: 1;
}

.game-title {
  font-size: 19px;
  font-weight: 800;
  margin-bottom: 12px;
  line-height: 1.3;
  text-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  letter-spacing: -0.02em;
}

.project-stats {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  opacity: 0.98;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 10px;
  border-radius: 14px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
  }
  
  :deep(.ui-icon) {
    width: 14px;
    height: 14px;
    opacity: 0.95;
  }
  
  span {
    font-weight: 700;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    letter-spacing: -0.01em;
  }
}

.branding {
  font-size: 13px;
  opacity: 0.95;
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: flex-end;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }
}

.branding::before {
  content: "✨";
  font-size: 16px;
}

/* 删除这个::after伪元素，因为我们已经用了更复杂的动画效果 */

.qr-section {
  flex: 0 0 200px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 16px;
  border: 1px solid var(--ui-color-dividing-line-1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.qr-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.qr-code-area {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: white;
  border: 2px solid var(--ui-color-dividing-line-1);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  position: relative;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: var(--ui-color-primary-main);
  }
  
  &::before {
    content: "";
    position: absolute;
    inset: -2px;
    background: linear-gradient(45deg, var(--ui-color-primary-main), #764ba2);
    border-radius: 12px;
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover::before {
    opacity: 0.1;
  }
}

.qr-canvas {
  display: block;
}

.qr-description {
  font-size: 13px;
  color: var(--ui-color-hint-2);
  text-align: center;
  max-width: 140px;
  line-height: 1.5;
  font-weight: 500;
  background: linear-gradient(135deg, var(--ui-color-hint-2) 0%, #999 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.download-section {
  display: flex;
  justify-content: center;
  
  :deep(.ui-button) {
    border-radius: 12px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(100, 158, 255, 0.3);
    transition: all 0.25s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(100, 158, 255, 0.4);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
}

.platform-selector {
  text-align: center;
}

.platform-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ui-color-title);
  margin-bottom: 20px;
  background: linear-gradient(135deg, var(--ui-color-title) 0%, #667eea 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.platform-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  width: 100%;
  padding: 0;
  flex-wrap: wrap;
}

.platform-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 12px;
  border: 2px solid var(--ui-color-dividing-line-1);
  border-radius: 16px;
  background: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex: 0 0 auto;
  min-width: 84px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, var(--ui-color-primary-main), #764ba2);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    border-color: var(--ui-color-primary-main);
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 8px 24px rgba(100, 158, 255, 0.25);
    
    &::before {
      opacity: 0.05;
    }
  }
  
  &.active {
    border-color: var(--ui-color-primary-main);
    background: linear-gradient(135deg, var(--ui-color-primary-tint) 0%, rgba(118, 75, 162, 0.1) 100%);
    box-shadow: 0 8px 24px rgba(100, 158, 255, 0.3);
    transform: translateY(-2px);
    
    &::before {
      opacity: 0.08;
    }
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
  }
}

.platform-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
  
  &::before {
    content: "";
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, currentColor, rgba(255, 255, 255, 0.3));
    border-radius: 14px;
    z-index: -1;
    opacity: 0.1;
  }
}

.platform-name {
  font-size: 13px;
  color: var(--ui-color-text);
  font-weight: 600;
  text-align: center;
  line-height: 1.3;
  position: relative;
  z-index: 1;
  transition: all 0.3s ease;
}
</style>
