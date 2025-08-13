<template>
  <UIFormModal
    :title="modalTitle"
    :visible="props.visible"
    :auto-focus="false"
    style="width: 500px"
    @update:visible="handleModalClose"
  >
    <!-- 调试信息 - 临时添加
    <div style="background: red; color: white; padding: 10px; margin: 10px">
      DEBUG: currentState = {{ currentState }}
    </div> -->
    <!-- 录屏界面 (initial/recording状态) -->
    <div v-if="currentState === 'initial' || currentState === 'recording'" class="recording-page">
      <!-- 项目预览区域 -->
      <div class="preview-section">
        <div class="project-preview">
          <!-- 现有的预览内容保持不变 -->
          <img v-if="projectThumbnail" :src="projectThumbnail" alt="Project thumbnail" />

          <div v-else class="placeholder">
            <div class="game-icon">🎮</div>
            <div class="project-name">{{ projectName }}</div>
          </div>

          <!-- 录屏控制按钮 -->
          <div class="record-overlay">
            <UIButton
              v-if="!isRecording"
              type="primary"
              size="large"
              :loading="isStarting"
              @click="handleStartRecording.fn"
            >
              <template #icon>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <!-- 圆形背景 -->
                  <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.2" />
                  <!-- 播放三角形 -->
                  <polygon points="7,5 15,10 7,15" fill="currentColor" />
                </svg>
              </template>
              {{ $t({ en: 'Record', zh: '录屏' }) }}
            </UIButton>

            <UIButton v-else type="secondary" size="large" :loading="isStopping" @click="handleStopRecording.fn">
              <template #icon>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <!-- 圆形背景 -->
                  <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.2" />
                  <!-- 左竖条 -->
                  <rect x="6.5" y="5" width="2.5" height="10" fill="currentColor" />
                  <!-- 右竖条 -->
                  <rect x="11" y="5" width="2.5" height="10" fill="currentColor" />
                </svg>
              </template>
              {{ $t({ en: 'Stop Recording', zh: '停止录屏' }) }}
            </UIButton>
          </div>
        </div>

        <!-- 录屏状态显示 -->
        <div v-if="isRecording" class="recording-status">
          <div class="recording-indicator">
            <div class="red-dot"></div>
            {{ $t({ en: 'Recording...', zh: '录制中...' }) }}
          </div>
          <div class="recording-time">{{ formatTime(recordingTime) }}</div>
        </div>
      </div>
      <!-- 分享平台区域 - 录屏时显示但禁用 -->
      <div class="share-section">
        <h4>{{ $t({ en: 'Share to Platform', zh: '分享到平台' }) }}</h4>
        <div class="platforms">
          <div
            v-for="platform in platforms"
            :key="platform.id"
            :class="['platform-item', { disabled: isRecording || !hasRecording }]"
            @click="isRecording ? null : handlePlatformShare(platform)"
          >
            <div class="platform-icon">
              <component :is="platform.icon" />
            </div>
            <span class="platform-name">{{ platform.name }}</span>
          </div>
        </div>

        <!-- 提示文字 -->
        <div v-if="isRecording" class="tip">
          {{
            $t({
              en: 'Recording in progress, platforms will be available after completion',
              zh: '录制中，完成录制后即可分享到各平台'
            })
          }}
        </div>
        <div v-else-if="!hasRecording" class="tip">
          {{ $t({ en: 'Complete recording to share', zh: '完成录屏后即可分享到各平台' }) }}
        </div>
      </div>
    </div>

    <!-- 平台选择界面 (completed状态) -->
    <div v-else-if="currentState === 'completed'" class="platform-selection-page">
      <!-- 显示录制完成的视频 -->
      <div class="preview-section">
        <div class="project-preview">
          <video
            v-if="recordedVideoUrl"
            :src="recordedVideoUrl"
            controls
            :poster="projectThumbnail"
            class="recorded-video"
          >
            您的浏览器不支持视频播放
          </video>
        </div>
      </div>
      <div class="auto-save-tip">
        <div class="tip-left">
          <div class="tip-text">
            {{
              $t({
                en: 'Recording saved to your Records. Not satisfied 👉',
                zh: '录屏已保存到您的Records，不满意 👉'
              })
            }}
          </div>
        </div>
        <div class="tip-right">
          <UIButton type="secondary" size="small" @click="handleReRecord">
            {{ $t({ en: 'Re-record', zh: '重新录制' }) }}
          </UIButton>
        </div>
      </div>

      <!-- 分享平台区域 -->
      <div class="share-section">
        <h4>{{ $t({ en: 'Share to Platform', zh: '分享到平台' }) }}</h4>
        <div class="platforms">
          <div
            v-for="platform in platforms"
            :key="platform.id"
            class="platform-item"
            @click="handlePlatformShare(platform)"
          >
            <div class="platform-icon">
              <component :is="platform.icon" />
            </div>
            <span class="platform-name">{{ platform.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 二维码界面 (qrcode状态) -->
    <div v-else-if="currentState === 'qrcode'" class="qrcode-page">
      <div class="qr-header">
        <button class="back-btn" @click="handleBackToPlatforms">← {{ $t({ en: 'Back', zh: '返回' }) }}</button>
        <h3>
          {{
            selectedPlatform === 'qq'
              ? $t({ en: 'Share to QQ', zh: 'QQ分享' })
              : $t({ en: 'Share to WeChat', zh: '微信分享' })
          }}
        </h3>
      </div>

      <div class="qr-content">
        <div class="qr-code-container">
          <img :src="qrCodeData" :alt="$t({ en: 'Share QR Code', zh: '分享二维码' })" class="qr-image" />
        </div>

        <div class="qr-instructions">
          <p v-if="selectedPlatform === 'qq'">
            {{
              $t({
                en: 'Scan the QR code above with QQ to share your game.',
                zh: '使用QQ扫描上方二维码，分享你的游戏作品。'
              })
            }}<br />
          </p>
          <p v-else-if="selectedPlatform === 'wechat'">
            {{
              $t({
                en: 'Scan the QR code above with WeChat to share your game.',
                zh: '使用微信扫描上方二维码，分享你的游戏作品。'
              })
            }}
          </p>
        </div>

        <div class="qr-actions">
          <button class="manual-download-btn" @click="handleManualDownload">
            {{ $t({ en: 'Download Video', zh: '手动下载视频' }) }}
          </button>
          <button class="copy-url-btn" @click="copyShareUrl">{{ $t({ en: 'Copy Link', zh: '复制链接' }) }}</button>
        </div>
      </div>
    </div>
  </UIFormModal>
</template>

  <script setup lang="ts">
import { UIButton, UIFormModal } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { generateShareQRCode, type ProjectShareInfo } from '@/utils/qrcode'
import { useI18n } from '@/utils/i18n' // 如果还没有导入的话
import QQIconSvg from '@/assets/images/qq.svg?raw'
import WeChatIconSvg from '@/assets/images/微信.svg?raw'
import DouyinIconSvg from '@/assets/images/抖音.svg?raw'
import XiaohongshuIconSvg from '@/assets/images/小红书.svg?raw'
import BilibiliIconSvg from '@/assets/images/bilibili.svg?raw'
import { ref, computed, onUnmounted, h } from 'vue'

const { t } = useI18n()
// 新增：创建SVG图标组件
const QQIcon = () =>
  h('div', {
    class: 'svg-icon',
    innerHTML: QQIconSvg
  })

const WeChatIcon = () =>
  h('div', {
    class: 'svg-icon',
    innerHTML: WeChatIconSvg
  })

const DouyinIcon = () =>
  h('div', {
    class: 'svg-icon',
    innerHTML: DouyinIconSvg
  })

const XiaohongshuIcon = () =>
  h('div', {
    class: 'svg-icon',
    innerHTML: XiaohongshuIconSvg
  })

const BilibiliIcon = () =>
  h('div', {
    class: 'svg-icon',
    innerHTML: BilibiliIconSvg
  })

const handleModalClose = (visible: boolean, reason?: string | Event) => {
  if (!visible) {
    // 检查关闭原因，如果是点击遮罩则阻止关闭
    if (reason === 'mask' || (reason as any)?.type === 'click') {
      // 阻止因点击遮罩而关闭
      return
    }

    // 如果是录屏完成状态被关闭，重置状态
    if (hasRecording.value) {
      resetRecordingState()
    }

    // 只有明确的关闭动作（如点击X）才触发关闭
    emit('cancelled')
  }
}

// 新增：重新录制处理函数
const handleReRecord = () => {
  // 重置录屏状态
  resetRecordingState()

  // 切换到初始状态
  currentState.value = 'initial'

  console.log('用户选择重新录制，状态已重置')
}

// 重置录屏状态的函数
const resetRecordingState = () => {
  // 重置录屏相关状态
  hasRecording.value = false
  recordedVideoUrl.value = null
  recordingTime.value = 0
  isRecording.value = false
  isStarting.value = false
  isStopping.value = false

  // 重置分享相关状态
  selectedPlatform.value = null
  qrCodeUrl.value = ''
  qrCodeData.value = ''

  // 重置页面状态到初始状态
  currentState.value = 'initial'

  // 清理计时器
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }

  // 清理媒体流
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => {
      track.stop()
    })
    mediaStream.value = null
  }

  // 清理视频URL
  if (recordedVideoUrl.value) {
    URL.revokeObjectURL(recordedVideoUrl.value)
  }

  // 清理MediaRecorder
  if (mediaRecorder.value) {
    mediaRecorder.value = null
  }

  console.log('录屏状态已重置到初始状态')
}

const props = defineProps<{
  visible: boolean
  projectName: string
  projectThumbnail?: string
  owner?: string
}>()

// 复制分享链接
const copyShareUrl = async () => {
  try {
    await navigator.clipboard.writeText(qrCodeUrl.value)
    console.log('分享链接已复制到剪贴板')
    // 这里可以添加一个提示消息
  } catch (error) {
    console.error('复制链接失败:', error)
  }
}

const emit = defineEmits<{
  cancelled: []
  resolved: []
  recordingStarted: [] // 录屏开始时触发
  recordingStopped: [] // 录屏停止时触发
}>()

// 状态管理
const isRecording = ref(false)
const isStarting = ref(false)
const isStopping = ref(false)
const hasRecording = ref(false)
const recordingTime = ref(0)
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordedVideoUrl = ref<string | null>(null)
// let recordingTimer: number | null = null
let recordingTimer: ReturnType<typeof setInterval> | null = null // 修改这里

// 在现有状态后添加
const selectedPlatform = ref<string | null>(null) // 当前选中的平台
// const showQRCode = ref(false) // 是否显示二维码
const qrCodeUrl = ref<string>('') // 二维码对应的URL
const qrCodeData = ref<string>('') // 二维码数据
const mediaStream = ref<MediaStream | null>(null) // 保存媒体流引用
// 新增：页面状态管理
type PageState = 'initial' | 'recording' | 'completed' | 'qrcode'
const currentState = ref<PageState>('initial')

// 动态标题
const modalTitle = computed(() => {
  switch (currentState.value) {
    case 'initial':
      return t({ en: 'Recording & Share', zh: '录屏分享' })
    case 'recording':
      return t({ en: 'Recording...', zh: '录制中...' })
    case 'completed':
      return t({ en: 'Choose Platform', zh: '选择平台' })
    case 'qrcode':
      return selectedPlatform.value === 'qq' ? 'QQ分享' : '微信分享'
    default:
      return t({ en: 'Recording & Share', zh: '录屏分享' })
  }
})

// 平台配置 - 使用SVG图标，支持双语
const platforms = computed(() => [
  {
    id: 'qq',
    name: t({ en: 'QQ', zh: 'QQ' }),
    icon: QQIcon
  },
  {
    id: 'wechat',
    name: t({ en: 'WeChat', zh: '微信' }),
    icon: WeChatIcon
  },
  {
    id: 'douyin',
    name: t({ en: 'TikTok', zh: '抖音' }),
    icon: DouyinIcon
  },
  {
    id: 'xiaohongshu',
    name: t({ en: 'RedBook', zh: '小红书' }),
    icon: XiaohongshuIcon
  },
  {
    id: 'bilibili',
    name: t({ en: 'Bilibili', zh: 'B站' }),
    icon: BilibiliIcon
  }
])

// 开始录屏 - 使用原来的逻辑
const handleStartRecording = useMessageHandle(
  async () => {
    isStarting.value = true
    try {
      console.log('开始请求屏幕录制权限...')

      // 使用原来的录屏逻辑
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })

      console.log('屏幕录制权限获取成功，用户已选择屏幕')

      mediaStream.value = stream

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
      })

      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        console.log('录制停止，生成视频文件')
        const blob = new Blob(chunks, { type: recorder.mimeType })
        const url = URL.createObjectURL(blob)
        recordedVideoUrl.value = url
        hasRecording.value = true

        currentState.value = 'completed'

        // 自动下载录制的视频
        // const link = document.createElement('a')
        // link.download = `${props.projectName}-recording.webm`
        // link.href = url
        // link.click()
      }

      recorder.start()
      mediaRecorder.value = recorder
      isRecording.value = true
      currentState.value = 'recording'

      // 新增：通知父组件录屏已开始，隐藏弹窗
      emit('recordingStarted')

      console.log('开始录制')

      // 开始计时
      recordingTime.value = 0
      recordingTimer = setInterval(() => {
        recordingTime.value++
      }, 1000)

      // 监听流结束事件（用户停止分享屏幕）
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (isRecording.value) {
          handleStopRecording.fn()
        }
      })
    } catch (error) {
      console.error('录制失败详细信息:', error)
      // 用户可能取消了屏幕分享选择
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.log('用户取消了屏幕分享')
      }
      throw error
    } finally {
      isStarting.value = false
    }
  },
  { en: 'Failed to start recording', zh: '开始录屏失败' }
)

// 停止录屏
const handleStopRecording = useMessageHandle(
  async () => {
    isStopping.value = true
    try {
      console.log('开始停止录制...')

      // 1. 停止MediaRecorder
      if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
        mediaRecorder.value.stop()
        console.log('MediaRecorder已停止')
      }

      // ========== 新增：完全停止屏幕分享流 ==========
      if (mediaStream.value) {
        // 停止所有轨道（视频和音频）
        mediaStream.value.getTracks().forEach((track) => {
          track.stop()
          console.log(`已停止${track.kind}轨道`)
        })
        mediaStream.value = null
        console.log('屏幕分享流已完全停止')
      }
      // =============================================

      // 2. 重置状态
      isRecording.value = false

      // 3. 停止计时器
      if (recordingTimer) {
        clearInterval(recordingTimer)
        recordingTimer = null
      }

      emit('recordingStopped')
      console.log('录制完全停止，状态已重置')
    } finally {
      isStopping.value = false
    }
  },
  { en: 'Failed to stop recording', zh: '停止录屏失败' }
)

// 图片处理函数 - 添加到 <script setup> 部分
const processImageForBilibili = async (imageBlob: Blob, projectName: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    img.onload = () => {
      try {
        const originalWidth = img.width
        const originalHeight = img.height

        console.log(`原始图片尺寸: ${originalWidth}x${originalHeight}`)

        // B站要求最小尺寸：960x600
        const minWidth = 960
        const minHeight = 600

        // 计算缩放比例，确保两个维度都满足最小要求
        const scaleX = minWidth / originalWidth
        const scaleY = minHeight / originalHeight
        const scale = Math.max(scaleX, scaleY) // 取较大的缩放比例，确保都满足最小尺寸

        // 计算新尺寸
        let newWidth = Math.ceil(originalWidth * scale)
        let newHeight = Math.ceil(originalHeight * scale)

        // 确保尺寸不小于要求
        newWidth = Math.max(newWidth, minWidth)
        newHeight = Math.max(newHeight, minHeight)

        console.log(`处理后尺寸: ${newWidth}x${newHeight} (缩放比例: ${scale.toFixed(2)})`)

        // 设置canvas尺寸
        canvas.width = newWidth
        canvas.height = newHeight

        // 绘制背景（防止透明图片问题）
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, newWidth, newHeight)

        // 计算图片在canvas中的位置（居中）
        const drawWidth = originalWidth * scale
        const drawHeight = originalHeight * scale
        const x = (newWidth - drawWidth) / 2
        const y = (newHeight - drawHeight) / 2

        // 使用高质量缩放
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // 绘制图片
        ctx.drawImage(img, x, y, drawWidth, drawHeight)

        // 添加XBuilder标识（可选）
        ctx.fillStyle = 'rgba(0, 161, 214, 0.8)'
        ctx.font = '24px Arial, sans-serif'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'bottom'
        ctx.fillText('XBuilder', newWidth - 20, newHeight - 20)

        // 转换为Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log(`封面处理完成，文件大小: ${(blob.size / 1024).toFixed(2)} KB`)
              resolve(blob)
            } else {
              reject(new Error('Canvas转换Blob失败'))
            }
          },
          'image/jpeg',
          0.9 // 质量设置为90%
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('图片加载失败'))
    }

    // 加载图片
    img.src = URL.createObjectURL(imageBlob)
  })
}

// B站分享处理
const handleBilibiliShare = useMessageHandle(
  async () => {
    if (!recordedVideoUrl.value) {
      throw new Error('录屏视频不存在')
    }

    console.log('开始B站投稿流程...')

    // ========== 新增：检查登录状态 ==========
    console.log('检查B站登录状态...')
    const loginCheckResponse = await fetch('http://localhost:3000/check-login')
    const loginStatus = await loginCheckResponse.json()

    if (!loginStatus.browserReady) {
      console.log('浏览器未准备就绪，开始登录流程...')

      // 触发登录
      const loginResponse = await fetch('http://localhost:3000/login')
      const loginResult = await loginResponse.json()

      if (!loginResult.success) {
        throw new Error(`登录失败：${loginResult.message}`)
      }

      console.log('登录成功，浏览器已准备就绪')
    }
    // ========================================

    // 1. 将Blob转换为File对象
    const response = await fetch(recordedVideoUrl.value)
    const blob = await response.blob()
    const videoFile = new File([blob], `${props.projectName}.webm`, { type: 'video/webm' })

    // 2. 自动生成投稿信息
    const title = `【XBuilder作品】${props.projectName}`
    const description = `这是我在XBuilder上创作的游戏作品《${props.projectName}》！

🎮 在XBuilder学编程，创造属于你的游戏世界！
📱 快来XBuilder创建你的第一个游戏吧！

#XBuilder #游戏开发 #编程学习 #创意游戏`

    const tags = 'XBuilder,游戏,编程,创作,教育'
    const category = 'game' // 游戏分区

    // 3. 准备FormData
    const formData = new FormData()
    formData.append('video', videoFile)
    formData.append('title', title)
    formData.append('description', description)
    formData.append('tags', tags)
    formData.append('category', category)

    // ========== 修改封面处理逻辑 ==========
    if (props.projectThumbnail) {
      try {
        console.log('下载并处理项目缩略图作为封面...')
        const thumbnailResponse = await fetch(props.projectThumbnail)
        const thumbnailBlob = await thumbnailResponse.blob()

        // 处理图片尺寸，确保符合B站要求（960x600以上）
        const processedCoverBlob = await processImageForBilibili(thumbnailBlob, props.projectName)

        const coverFile = new File([processedCoverBlob], `${props.projectName}-cover.jpg`, {
          type: 'image/jpeg'
        })
        formData.append('cover', coverFile)
        console.log('封面图片已处理并添加到FormData')
      } catch (error) {
        console.warn('封面图片处理失败，将使用默认封面:', error)
      }
    }

    // 4. 调用B站投稿服务
    console.log('调用B站自动化投稿服务...')
    const response2 = await fetch('http://localhost:3000/auto-upload', {
      method: 'POST',
      body: formData
    })

    const result = await response2.json()

    if (result.success) {
      console.log('B站投稿成功！', result)
    } else {
      throw new Error(result.message || 'B站投稿失败')
    }
  },
  { en: 'Failed to share to Bilibili', zh: 'B站分享失败' },
  { en: 'Successfully shared to Bilibili!', zh: 'B站投稿成功！' }
)

// 处理QQ和微信分享
const handleSocialMediaShare = async (platform: any) => {
  try {
    selectedPlatform.value = platform.id

    // 准备项目分享信息
    const projectInfo: ProjectShareInfo = {
      projectName: props.projectName,
      // projectUrl: `${window.location.origin}/project/${props.owner}/${props.projectName}`, // 根据实际路由调整
      projectUrl: `https://builder.goplus.org/project/${props.owner}/${props.projectName}`,
      description: `这是我在XBuilder上创作的游戏作品《${props.projectName}》！🎮 在XBuilder学编程，创造属于你的游戏世界！`,
      thumbnail: props.projectThumbnail
    }

    // 生成二维码
    console.log(`正在生成${platform.name}分享二维码...`)
    const qrCodeDataUrl = await generateShareQRCode(platform.id, projectInfo, {
      width: 200,
      margin: 3
    })

    qrCodeData.value = qrCodeDataUrl
    // showQRCode.value = true
    qrCodeUrl.value = projectInfo.projectUrl // 暂定为 projectUrl

    console.log(`${platform.name}分享二维码已生成`)
  } catch (error) {
    console.error(`生成${platform.name}分享二维码失败:`, error)
    // 可以显示错误提示给用户
  }
}

// 修改分享到平台的函数
const handlePlatformShare = async (platform: any) => {
  if (!hasRecording.value) {
    console.log('录屏尚未完成，无法分享')
    return
  }

  console.log(`准备分享到${platform.name}`)

  // 特殊处理B站平台
  if (platform.id === 'bilibili') {
    await handleBilibiliShare.fn()
    return
  }

  // 处理QQ和微信平台 - 显示二维码
  if (platform.id === 'qq' || platform.id === 'wechat') {
    selectedPlatform.value = platform.id
    await handleSocialMediaShare(platform)
    currentState.value = 'qrcode'
    return
  }

  // 其他平台保持原有逻辑（直接下载）
  if (recordedVideoUrl.value) {
    const link = document.createElement('a')
    link.download = `${props.projectName}-for-${platform.id}.webm`
    link.href = recordedVideoUrl.value
    link.click()
    console.log(`已为${platform.name}下载视频文件`)
  }
}

// 格式化时间
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 手动下载视频文件
const handleManualDownload = () => {
  if (recordedVideoUrl.value && selectedPlatform.value) {
    const link = document.createElement('a')
    link.download = `${props.projectName}-for-${selectedPlatform.value}.webm`
    link.href = recordedVideoUrl.value
    link.click()
    console.log(`手动下载${selectedPlatform.value}平台视频文件`)
  }
}

// 返回到平台选择页面
const handleBackToPlatforms = () => {
  currentState.value = 'completed'
  selectedPlatform.value = null
  qrCodeUrl.value = ''
  qrCodeData.value = ''
}

// 清理定时器和资源
// 修改 onUnmounted 函数
onUnmounted(() => {
  // 清理计时器
  if (recordingTimer) {
    clearInterval(recordingTimer)
  }

  // 清理视频URL
  if (recordedVideoUrl.value) {
    URL.revokeObjectURL(recordedVideoUrl.value)
  }

  // ========== 新增：清理媒体流 ==========
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => {
      track.stop()
    })
    mediaStream.value = null
  }
  // ====================================
})
</script>
  
  <style scoped lang="scss">
.preview-section {
  margin-bottom: 20px;
}

.project-preview {
  position: relative;
  width: 100%;
  height: 240px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border: 2px solid #e1e5e9;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #64748b;

    .game-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .project-name {
      font-size: 18px;
      font-weight: 600;
      color: #334155;
    }
  }
}

.record-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.recording-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 1px solid #fca5a5;
  border-radius: 8px;
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #dc2626;
  font-weight: 600;
  font-size: 14px;
}

.red-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #dc2626;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.recording-time {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 16px;
  color: #dc2626;
  background: rgba(255, 255, 255, 0.8);
  padding: 4px 8px;
  border-radius: 4px;
}

.share-section {
  h4 {
    margin: 13px 0px;
    color: #1e293b;
    font-size: 16px;
    font-weight: 600;
  }
}

.platforms {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.platform-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid #e2e8f0;
  background: white;

  &:not(.disabled):hover {
    border-color: #3b82f6;
    background: #f8fafc;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: #f8fafc;

    &:hover {
      transform: none;
      box-shadow: none;
      border-color: #e2e8f0;
    }
  }
}

.platform-icon {
  margin-bottom: 8px;

  :deep(.svg-icon) {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 28px;
      height: 28px;
      max-width: 100%;
      max-height: 100%;
    }
  }
}

.platform-name {
  font-size: 12px;
  color: #475569;
  font-weight: 500;
  text-align: center;
}

.tip {
  text-align: center;
  color: #64748b;
  font-size: 13px;
  padding: 12px;
  background: #f1f5f9;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.recorded-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.recording-complete {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 100%);
  border-radius: 8px;
  border: 1px solid #93c5fd;

  .complete-indicator {
    display: flex;
    align-items: center;
    font-weight: 600;
    color: #059669;

    .green-dot {
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
      margin-right: 8px;
    }
  }

  .video-info {
    color: #0369a1;
    font-size: 14px;
  }
}
// 新增：页面布局样式
.recording-page,
.platform-selection-page,
.qrcode-page {
  min-height: 300px;
}

// 新增：二维码页面样式
.qr-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;

  .back-btn {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 14px;
    padding: 8px;
    border-radius: 4px;
    margin-right: 12px;

    &:hover {
      background: #f5f5f5;
      color: #333;
    }
  }

  h3 {
    margin: 0;
    color: #333;
    font-size: 18px;
    font-weight: 600;
  }
}

.qr-content {
  text-align: center;

  .qr-code-container {
    padding: 20px;
    background: #f8f9fa;
    border-radius: 12px;
    margin-bottom: 20px;

    .qr-image {
      width: 200px;
      height: 200px;
      border-radius: 8px;
    }
  }
}

.qr-content {
  text-align: center;

  .qr-code-container {
    padding: 20px;
    background: #f8f9fa;
    border-radius: 12px;
    margin-bottom: 20px;

    .qr-image {
      width: 200px;
      height: 200px;
      border-radius: 8px;
    }
  }

  .qr-instructions {
    margin-bottom: 24px;

    p {
      color: #666;
      line-height: 1.6;
      margin: 0;
      font-size: 14px;
    }
  }

  .qr-actions {
    display: flex;
    gap: 12px;
    justify-content: center;

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &.manual-download-btn {
        background: #52c41a;
        color: white;

        &:hover {
          background: #389e0d;
        }
      }

      &.copy-url-btn {
        background: #1890ff;
        color: white;

        &:hover {
          background: #096dd9;
        }
      }
    }
  }
}
.auto-save-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 13px;
  margin-top: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 8px;

  .tip-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0; // 防止文本溢出
  }

  .tip-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .tip-text {
    color: #0369a1;
    font-size: 13px;
    line-height: 1.4;
  }

  .tip-right {
    flex-shrink: 0;
  }
}
</style>