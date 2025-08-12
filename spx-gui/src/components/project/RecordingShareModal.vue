<template>
  <UIFormModal
    :title="$t({ en: 'Recording & Share', zh: '录屏分享' })"
    :visible="props.visible"
    :auto-focus="false"
    style="width: 500px"
    @update:visible="emit('cancelled')"
  >
    <!-- 项目预览区域 -->
    <div class="preview-section">
      <div class="project-preview">
        <!-- 如果有录制的视频，显示视频；否则显示项目图片 -->
        <video
          v-if="hasRecording && recordedVideoUrl"
          :src="recordedVideoUrl"
          controls
          :poster="projectThumbnail"
          class="recorded-video"
        >
          您的浏览器不支持视频播放
        </video>

        <img v-else-if="projectThumbnail" :src="projectThumbnail" alt="Project thumbnail" />

        <div v-else class="placeholder">
          <div class="game-icon">🎮</div>
          <div class="project-name">{{ projectName }}</div>
        </div>

        <!-- 录屏控制按钮 - 只在没有录制时显示 -->
        <div v-if="!hasRecording" class="record-overlay">
          <UIButton
            v-if="!isRecording"
            type="primary"
            size="large"
            :loading="isStarting"
            @click="handleStartRecording.fn"
          >
            <template #icon>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="3" fill="currentColor" />
              </svg>
            </template>
            {{ $t({ en: 'Record', zh: '录屏' }) }}
          </UIButton>

          <UIButton v-else type="secondary" size="large" :loading="isStopping" @click="handleStopRecording">
            <template #icon>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="7" y="7" width="6" height="6" fill="currentColor" />
              </svg>
            </template>
            {{ $t({ en: 'Stop Recording', zh: '停止录屏' }) }}
          </UIButton>
        </div>
      </div>

      <!-- 录屏完成状态显示 -->
      <div v-if="hasRecording" class="recording-complete">
        <div class="complete-indicator">
          <div class="green-dot"></div>
          {{ $t({ en: 'Recording Complete', zh: '录制完成' }) }}
        </div>
        <div class="video-info">
          {{ $t({ en: 'Ready to share', zh: '可以开始分享了' }) }}
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

    <!-- 分享平台区域 -->
    <div class="share-section">
      <h4>{{ $t({ en: 'Share to Platform', zh: '分享到平台' }) }}</h4>
      <div class="platforms">
        <div
          v-for="platform in platforms"
          :key="platform.id"
          :class="['platform-item', { disabled: !hasRecording }]"
          :title="hasRecording ? `分享到${platform.name}` : '完成录屏后才可分享'"
          @click="handlePlatformShare(platform)"
        >
          <div class="platform-icon">
            <component :is="platform.icon" />
          </div>
          <span class="platform-name">{{ platform.name }}</span>
        </div>
      </div>

      <!-- 提示文字 -->
      <div v-if="!hasRecording" class="tip">
        {{ $t({ en: 'Complete recording to share', zh: '完成录屏后即可分享到各平台' }) }}
      </div>
    </div>
  </UIFormModal>
</template>
  
  <script setup lang="ts">
import { ref, computed, onUnmounted, h } from 'vue'
import { UIButton, UIFormModal } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  visible: boolean
  projectName: string
  projectThumbnail?: string
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
  recordingStarted: [] // 新增：录屏开始时触发
  recordingStopped: [] // 新增：录屏停止时触发
}>()

// 状态管理
const isRecording = ref(false)
const isStarting = ref(false)
const isStopping = ref(false)
const hasRecording = ref(false)
const recordingTime = ref(0)
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordedVideoUrl = ref<string | null>(null)
let recordingTimer: number | null = null

// 平台配置 - 使用简单的文字图标
const platforms = [
  {
    id: 'qq',
    name: 'QQ',
    icon: () => h('div', { class: 'text-icon', style: 'background: #1296db; color: white;' }, 'QQ')
  },
  {
    id: 'wechat',
    name: '微信',
    icon: () => h('div', { class: 'text-icon', style: 'background: #07c160; color: white;' }, '微信')
  },
  {
    id: 'douyin',
    name: '抖音',
    icon: () => h('div', { class: 'text-icon', style: 'background: #000; color: white;' }, '抖音')
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    icon: () => h('div', { class: 'text-icon', style: 'background: #ff2442; color: white;' }, '小红书')
  },
  {
    id: 'bilibili',
    name: 'B站',
    icon: () => h('div', { class: 'text-icon', style: 'background: #00a1d6; color: white;' }, 'B站')
  }
]

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

        // 自动下载录制的视频（保持原来的行为）
        const link = document.createElement('a')
        link.download = `${props.projectName}-recording.webm`
        link.href = url
        link.click()

        console.log('录制完成，视频已保存，现在可以分享了')
      }

      recorder.start()
      mediaRecorder.value = recorder
      isRecording.value = true

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
      if (error.name === 'NotAllowedError') {
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
      if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
        mediaRecorder.value.stop()
      }
      isRecording.value = false

      if (recordingTimer) {
        clearInterval(recordingTimer)
        recordingTimer = null
      }
      emit('recordingStopped')

      console.log('手动停止录制')
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

// 分享到平台
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

  // 其他平台保持原有逻辑
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

// 清理定时器和资源
onUnmounted(() => {
  if (recordingTimer) {
    clearInterval(recordingTimer)
  }
  if (recordedVideoUrl.value) {
    URL.revokeObjectURL(recordedVideoUrl.value)
  }
})
</script>
  
  <style scoped lang="scss">
.preview-section {
  margin-bottom: 32px;
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
    margin-bottom: 20px;
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

  :deep(.text-icon) {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
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
  margin-top: 16px;
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
</style>