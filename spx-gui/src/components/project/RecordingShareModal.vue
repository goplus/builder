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

// 分享到平台
const handlePlatformShare = (platform: any) => {
  if (!hasRecording.value) {
    console.log('录屏尚未完成，无法分享')
    return
  }

  console.log(`准备分享到${platform.name}`)

  // 这里可以添加具体的分享逻辑
  if (recordedVideoUrl.value) {
    // 对于现在来说，重新下载文件（将来可以改为真正的平台分享）
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
</style>