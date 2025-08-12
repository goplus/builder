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
                  <div class="game-title">{{ projectName }}</div>
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

interface Platform {
  id: string
  name: string
  icon: string
  color: string
  shareUrl: string
}

const props = defineProps<{
  visible: boolean
  screenshotDataUrl?: string
  projectName?: string
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.screenshot-share-modal {
  width: 40%;
  max-width: 520px;
  min-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 10px;
  border-bottom: 1px solid var(--ui-color-dividing-line-1);
  
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--ui-color-title);
    text-align: center;
    flex: 1;
  }
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--ui-color-hint-2);
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--ui-color-grey-hover);
    color: var(--ui-color-text);
  }
  
  :deep(.ui-icon) {
    width: 16px;
    height: 16px;
  }
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  flex: 1;
  min-height: 0;
  align-items: center;
}

.top-content {
  display: flex;
  gap: 24px;
  flex: 1;
  min-height: 0;
  width: 100%;
  justify-content: center;
  align-items: center;
}

.poster-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.bottom-content {
  flex: 0 0 auto;
  border-top: 1px solid var(--ui-color-dividing-line-1);
  padding-top: 20px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.poster-container {
  width: 100%;
  max-width: 220px;
  aspect-ratio: 3/4;
  position: relative;
}

.poster-background {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #a8e6cf 0%, #88d8a3 100%);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: relative;
}

.screenshot-area {
  flex: 1;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 16px;
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
}

.game-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.branding {
  font-size: 12px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 8px;
}

.branding::before {
  content: "🔨";
  font-size: 14px;
}

.poster-background::after {
  content: "";
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-section {
  flex: 0 0 180px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  align-items: center;
}

.qr-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.qr-code-area {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background: white;
  border: 2px solid var(--ui-color-dividing-line-1);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qr-canvas {
  display: block;
}

.qr-description {
  font-size: 12px;
  color: var(--ui-color-hint-2);
  text-align: center;
  max-width: 120px;
  line-height: 1.4;
}

.download-section {
  display: flex;
  justify-content: center;
}

.platform-selector {
  text-align: center;
}

.platform-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ui-color-title);
  margin-bottom: 16px;
}

.platform-buttons {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  width: 100%;
  padding: 0 8px;
}

.platform-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border: 2px solid var(--ui-color-dividing-line-1);
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  max-width: 90px;
  
  &:hover {
    border-color: var(--ui-color-primary-main);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  &.active {
    border-color: var(--ui-color-primary-main);
    background: var(--ui-color-primary-tint);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
  }
}

.platform-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.platform-name {
  font-size: 12px;
  color: var(--ui-color-text);
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}
</style>
