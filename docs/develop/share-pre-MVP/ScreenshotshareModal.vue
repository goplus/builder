<template>
    <UIFormModal
      :title="$t({ en: 'Share Screenshot', zh: '分享截图' })"
      :visible="visible"
      :auto-focus="false"
      @update:visible="handleClose"
    >
      <!-- 分享内容 -->
      <div class="share-content">
        <div class="share-title">
          {{ $t({ en: 'This screenshot is great, share it with friends!', zh: '截图这么棒,分享给好友吧!' }) }}
        </div>
        <div class="share-main">
          <div class="poster-section">
            <PosterBackground
              :img-src="screenshotDataUrl"
              img-alt="Screenshot"
              :project-name="projectName"
              :creator-name="creatorName"
              :project-description="projectDescription"
              :stats="posterStats"
              :logo-src="logoSrc"
              :show-qr="true"
            />
          </div>
          <div class="qr-section">
            <div class="qr-section-inner">
              <div class="qr-content">
                <div class="qr-code">
                  <img :src="qrCodeData" :alt="$t({ en: 'Share QR Code', zh: '分享二维码' })" class="qr-image" />
                </div>
                <div class="qr-hint">
                  {{ $t({ en: 'Scan the code with the corresponding platform to share', zh: '用对应平台进行扫码分享' }) }}
                </div>
              </div>
              <UIButton
                class="download-btn"
                type="primary"
                size="small"
                :loading="isDownloading"
                @click="handleDownload"
              >
                {{ $t({ en: 'One-click Download', zh: '一键下载' }) }}
              </UIButton>
            </div>
          </div>
        </div>
        <div class="share-methods-section">
          <div class="section-label">{{ $t({ en: 'Share Method', zh: '分享方式' }) }}</div>
          <div class="social-icons">
            <div
              v-for="platform in platforms"
              :key="platform.id"
              class="social-icon"
              :class="{ active: selectedPlatform.id === platform.id }"
              @click="selectPlatform(platform)"
            >
              <div class="icon-wrapper">
                <img v-if="platform.id === 'qq'" src="@/assets/images/qq.svg" class="icon" alt="QQ" />
                <img v-else-if="platform.id === 'wechat'" src="@/assets/images/微信.svg" class="icon" alt="WeChat" />
                <img v-else-if="platform.id === 'douyin'" src="@/assets/images/抖音.svg" class="icon" alt="Douyin" />
                <img v-else-if="platform.id === 'xiaohongshu'" src="@/assets/images/小红书.svg" class="icon" alt="Xiaohongshu" />
                <img v-else-if="platform.id === 'bilibili'" src="@/assets/images/bilibili.svg" class="icon" alt="Bilibili" />
              </div>
              <span class="platform-name">{{ $t(platform.name) }}</span>
            </div>
          </div>
        </div>
      </div>
    </UIFormModal>
  </template>
  
  <script setup lang="ts">
  import PosterBackground from './PosterBackground.vue'
  import { ref, watch, onMounted, nextTick, computed } from 'vue'
  import html2canvas from 'html2canvas'
  import { UIButton, UIIcon } from '@/components/ui'
  import { UIFormModal } from '@/components/ui/modal'
  import { humanizeCount } from '@/utils/utils'
  import logoSrc from '@/components/navbar/logo.svg'
  import { generateQRCode } from '@/utils/qrcode'
  
  interface Platform {
    id: string
    name: { en: string, zh: string }
    icon: string
    color: string
    shareUrl: string
  }
  
  interface ProjectStats {
    viewCount?: number
    likeCount?: number
    remixCount?: number
  }
  
  interface SelectedArea {
    x: number
    y: number
    width: number
    height: number
  }
  
  const props = defineProps<{
    visible: boolean
    screenshotDataUrl?: string
    screenshotWidth?: number
    screenshotHeight?: number
    projectName?: string
    creatorName?: string
    projectDescription?: string
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
  
  const isDownloading = ref(false)
  
  // 二维码相关状态
  const qrCodeData = ref<string>('') // 二维码数据
  
  // 截图相关状态
  const croppedScreenshotDataUrl = ref<string>('')
  const selectedArea = ref<SelectedArea | null>(null)
  
  // 获取当前页面URL
  function getCurrentProjectUrl() {
    return window.location.origin + window.location.pathname;
  }
  
  // 平台配置
  const platforms: Platform[] = [
    {
      id: 'qq',
      name: { en: 'QQ', zh: 'QQ' },
      icon: '🐧',
      color: '#12B7F5',
      shareUrl: 'https://qzone.qq.com'
    },
    {
      id: 'wechat',
      name: { en: 'WeChat', zh: '微信' },
      icon: '💬',
      color: '#09BB07',
      shareUrl: 'https://weixin.qq.com'
    },
    {
      id: 'douyin',
      name: { en: 'TikTok', zh: '抖音' },
      icon: '🎵',
      color: '#FE2C55',
      shareUrl: 'https://www.douyin.com'
    },
    {
      id: 'xiaohongshu',
      name: { en: 'RedNote', zh: '小红书' },
      icon: '📖',
      color: '#FF2442',
      shareUrl: 'https://www.xiaohongshu.com'
    },
    {
      id: 'bilibili',
      name: { en: 'Bilibili', zh: 'B站' },
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
  
  // 简单的数字格式化函数
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M'
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K'
    }
    return count.toString()
  }
  
  // 计算海报统计数据
  const posterStats = computed(() => {
    if (!props.projectStats) return undefined
    return {
      viewCount: props.projectStats.viewCount ? formatCount(props.projectStats.viewCount) : undefined,
      likeCount: props.projectStats.likeCount ? formatCount(props.projectStats.likeCount) : undefined,
      remixCount: props.projectStats.remixCount ? formatCount(props.projectStats.remixCount) : undefined
    }
  })
  
  // 处理区域选择完成（保留以备将来使用）
  const handleAreaSelected = async (area: SelectedArea) => {
    try {
      selectedArea.value = area
      await cropScreenshot(area)
    } catch (error) {
      console.error('裁剪截图失败:', error)
    }
  }
  
  // 处理区域选择取消（保留以备将来使用）
  const handleAreaSelectionCancelled = () => {
    emit('close')
  }
  
  // 裁剪截图
  const cropScreenshot = async (area: SelectedArea) => {
    if (!props.screenshotDataUrl) return
  
    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('无法获取canvas上下文'))
            return
          }
  
          // 设置canvas尺寸为裁剪区域大小
          canvas.width = area.width
          canvas.height = area.height
  
          // 绘制裁剪区域
          ctx.drawImage(
            img,
            area.x, area.y, area.width, area.height, // 源图像裁剪区域
            0, 0, area.width, area.height // 目标canvas区域
          )
  
          // 转换为dataURL
          croppedScreenshotDataUrl.value = canvas.toDataURL('image/png')
          resolve()
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }
      
      img.src = props.screenshotDataUrl!
    })
  }
  
  // 监听弹窗显示状态，显示时直接生成二维码
  watch(() => props.visible, (newVisible) => {
    if (newVisible && props.screenshotDataUrl) {
      // 重置状态
      croppedScreenshotDataUrl.value = ''
      selectedArea.value = null
      
      // 生成二维码
      nextTick(() => {
        generateShareQRCode()
      })
    } else if (!newVisible) {
      // 关闭时重置状态
      croppedScreenshotDataUrl.value = ''
      selectedArea.value = null
    }
  })
  
  function selectPlatform(platform: Platform) {
    selectedPlatform.value = platform
    generateShareQRCode()
  }
  
  async function generateShareQRCode() {
    try {
      // 准备项目分享信息
      const projectInfo = {
        projectName: props.projectName || '',
        projectUrl: getCurrentProjectUrl(),
        description: `这是我在XBuilder上创作的游戏作品${props.projectName ? `《${props.projectName}》` : ''}！🎮 在XBuilder学编程，创造属于你的游戏世界！`,
        thumbnail: props.screenshotDataUrl
      }
  
      // 生成二维码
      console.log(`正在生成${selectedPlatform.value.name.zh}分享二维码...`)
      const qrCodeDataUrl = await generateQRCode(projectInfo.projectUrl, {
        width: 120,
        margin: 3
      })
  
      qrCodeData.value = qrCodeDataUrl
      console.log(`${selectedPlatform.value.name.zh}分享二维码已生成`)
    } catch (error) {
      console.error(`生成${selectedPlatform.value.name.zh}分享二维码失败:`, error)
    }
  }
  
  async function handleDownload() {
    isDownloading.value = true
    try {
      // 获取 poster-background 区域
      const posterEl = document.querySelector('.poster-background') as HTMLElement
      if (!posterEl) throw new Error('未找到分享海报区域')
  
      // 使用 html2canvas 渲染整个 poster 区域
      const canvas = await html2canvas(posterEl, {
        useCORS: true,
        backgroundColor: null,
        scale: window.devicePixelRatio || 2
      })
      const dataUrl = canvas.toDataURL('image/png')
  
      // 下载图片
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${props.projectName || 'game'}-poster.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
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
  
  onMounted(() => {
    // 组件挂载时的初始化逻辑（如果需要的话）
  });
  </script>
  
  
  <style lang="scss" scoped>
  
  .project-qrcode {
    display: flex;
    align-items: center;
    height: 60px;
    min-width: 60px;
    //margin-left: 0;
  }
  
  .share-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    padding: 20px 0;
  }
  
  .share-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--ui-color-title);
    text-align: center;
    margin-bottom: 24px;
  }
  
  .share-main {
    height: 100%;
    display: flex;
    gap: 24px;
  }
  
  
  .poster-section {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: stretch;
    height: 100%;
  }
  
  
  .qr-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }
  
  .qr-code {
    width: 120px;
    height: 120px;
    margin: 0 auto;
  }
  
  .qr-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .qr-hint {
    font-size: 12px;
    color: var(--ui-color-hint-2);
    line-height: 1.3;
    text-align: center;
    word-wrap: break-word;
    max-width: 100%;
  }
  
  .download-btn {
    width: 100%;
    margin-top: 8px;
    border-radius: 6px;
  }
  
  .share-methods-section {
    margin-top: 8px;
  }
  
  .section-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--ui-color-hint-1);
    margin-bottom: 12px;
  }
  
  .social-icons {
    display: flex;
    gap: 48px;
    justify-content: center;
  }
  
  .social-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  
    &:hover {
      transform: translateY(-2px);
    }
  
    &.active .icon-wrapper {
      border: 2px solid var(--ui-color-red-main);
    }
  }
  
  .icon-wrapper {
    width: 48px;
    height: 48px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    transition: all 0.2s ease;
  }
  
  .icon {
    width: 42px;
    height: 42px;
    display: block;
    flex-shrink: 0;
  }
  
  .platform-name {
    font-size: 12px;
    color: var(--ui-color-hint-1);
  }
  
  .poster-background {
    width: 100%;
    height: 100%;
    background-image: url('@/assets/images/postBackground.jpg');
    background-size: cover;
    background-position: center;
    padding: 24px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    /* box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15); */
    transition: all 0.3s ease;
    max-height: 500px;
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
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
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
    display: flex;
    align-items: center;
    height: 60px;
    background: rgba(255, 255, 255, 0.2);
    padding: 10px 16px;
    border-radius: 24px;
    backdrop-filter: blur(4px);
    box-sizing: border-box;
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
    }
  }
  
  /* 拓展qr-section高度并让内容平均分布 */
  .qr-section {
    flex: 1 1 0%;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    align-items: stretch;
    min-width: 220px;
    min-height: 0;
    padding: 16px;
  }
  
  .qr-section-inner {
    flex: 1 1 0%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: 0;
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