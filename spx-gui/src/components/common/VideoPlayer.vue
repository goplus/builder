<!-- VideoPlayer.vue -->
<template>
  <div
    ref="containerRef"
    class="video-player-container"
    @mousemove="handleMouseMove"
    @mouseenter="showProgress"
    @mouseleave="hideProgress"
  >
    <!-- 视频元素（禁用原生控制） -->
    <video
      ref="videoRef"
      :src="props.videoUrl"
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @click="togglePlay"
      @ended="onVideoEnded"
    ></video>

    <!-- 视频暂停显示播放操作图标 -->
    <div v-show="videoRef && isPaused" class="pause-center-icon">
      <img :src="playCenterSvg" />
    </div>

    <!-- 自定义进度条（和全屏、缩小、播放、暂停按钮） -->
    <div class="progress-bar" :class="{ visible: progressVisible }">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        <!-- 根据 segments 绘制小圆点 -->
        <div
          v-for="(seg, index) in props.segments"
          :key="index"
          class="segment-dot"
          :style="{ left: (seg.endTime / videoDuration) * 100 + '%' }"
        ></div>
      </div>

      <!-- 播放按钮 -->
      <div v-if="videoRef && isPaused" class="play-button" @click="play">
        <img :src="playSvg" />
      </div>
      <!-- 暂停按钮 -->
      <div v-else class="pause-button" @click="pause">
        <img :src="pauseSvg" />
      </div>

      <!-- 全屏按钮：非全屏状态下显示 -->
      <div v-if="!isFullScreen" class="fullscreen-button" @click="enterFullScreen">
        <img :src="maximizeSvg" />
      </div>
      <!-- 缩小按钮：全屏状态下显示 -->
      <div v-else class="minimize-button" @click="exitFullScreen">
        <img :src="minimizeSvg" />
      </div>

      <!-- 播放时长显示 -->
      <div class="play-time">{{ formattedCurrentTime }} / {{ formattedDuration }}</div>
    </div>

    <!-- 自定义封面区域，通过具名插槽 cover 提供 -->
    <div v-if="coverVisible" class="cover-overlay">
      <slot name="cover"></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import maximizeSvg from './icons/maximize.svg'
import minimizeSvg from './icons/minimize.svg'
import playSvg from './icons/play.svg'
import pauseSvg from './icons/pause.svg'
import playCenterSvg from './icons/play_center.svg'

type Segment = {
  endTime: number
  extension?: Object
}
type Props = {
  videoUrl: string
  segments: Segment[]
}
type Events = {
  segmentEnd: [segment: Segment]
}
type Expose = {
  play(): void
  pause(): void
  showCover(): void
  hideCover(): void
  endCurrentSegment(): void
  enterFullScreen(): void
  exitFullScreen(): void
}

const props = defineProps<Props>()
const emit = defineEmits<Events>()

// 视频元素和容器引用
const videoRef = ref<HTMLVideoElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

// 创建响应式的播放时间
const currentTime = ref(0)

// 状态：封面显示、进度条显示、全屏状态、视频暂停状态
const coverVisible = ref(false)
const progressVisible = ref(false)
const isFullScreen = ref(false)
const isPaused = ref(true)

// 当前视频播放时长与进度百分比
const videoDuration = ref(0)
const progressPercent = ref(0)

// 已触发的分段索引，防止重复触发 segmentEnd
const triggeredSegments = ref<number[]>([-1])

// 格式化时间：将秒数转化为 "00:00" 或 "01:00:00" 格式
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const sec = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  } else {
    return `${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
}

// 当前播放时间（格式化为“mm:ss”或“hh:mm:ss”）
const formattedCurrentTime = computed(() => {
  return formatTime(currentTime.value)
})

// 视频总时长（格式化为“mm:ss”或“hh:mm:ss”）
const formattedDuration = computed(() => {
  return formatTime(videoDuration.value)
})

/** 播放、暂停、切换播放状态 */
function play() {
  videoRef.value?.play()
  isPaused.value = false
}
function pause() {
  videoRef.value?.pause()
  isPaused.value = true
}
function togglePlay() {
  if (!videoRef.value) return
  if (videoRef.value.paused) play()
  else pause()
}

/** 封面显示控制 */
function showCover() {
  coverVisible.value = true
}
function hideCover() {
  coverVisible.value = false
}
/** 结束当前分段的视频播放：快进到当前分段结束点，然后触发 segmentEnd 事件 */
function endCurrentSegment() {
  if (triggeredSegments.value !== null && videoRef.value) {
    const seg = props.segments[triggeredSegments.value[triggeredSegments.value.length - 1] + 1]
    // 快进到分段结束点
    videoRef.value.currentTime = seg.endTime
  }
}

/** 全屏相关 */
function enterFullScreen() {
  if (containerRef.value && containerRef.value.requestFullscreen) {
    containerRef.value.requestFullscreen()
    isFullScreen.value = true
  }
}
function exitFullScreen() {
  if (document.fullscreenElement) {
    isFullScreen.value = false
    document.exitFullscreen()
  }
}

/** 监听视频播放时间更新 */
function onTimeUpdate() {
  if (!videoRef.value) return
  currentTime.value = videoRef.value.currentTime
  if (!videoDuration.value && videoRef.value.duration) {
    videoDuration.value = videoRef.value.duration
  }
  progressPercent.value = (currentTime.value / videoDuration.value) * 100

  // 检查是否到达分段结束点
  props.segments.forEach((seg, index) => {
    if (currentTime.value >= seg.endTime && !triggeredSegments.value.includes(index)) {
      triggeredSegments.value.push(index)
      emit('segmentEnd', seg)
    }
  })
}

/** 视频播放结束重置状态 */
function onVideoEnded() {
  triggeredSegments.value = [-1]
}

/** 进度条显示控制 */
function showProgress() {
  progressVisible.value = true
}
function hideProgress() {
  progressVisible.value = false
}

/** 全屏下鼠标移动：显示进度条和缩小按钮，并几秒后隐藏 */
let mouseMoveTimer: number | undefined = undefined
function handleMouseMove() {
  if (isFullScreen.value) {
    showProgress()
    if (mouseMoveTimer) clearTimeout(mouseMoveTimer)
    mouseMoveTimer = window.setTimeout(() => {
      hideProgress()
    }, 3000)
  }
}

// 监听键盘事件：在全屏状态下按下空格切换播放状态
function handleKeydown(event: KeyboardEvent) {
  if (isFullScreen.value && event.code === 'Space') {
    togglePlay()
  }
}

/** 监听全屏状态变化以同步 isFullScreen 状态 */
function handleFullScreenChange() {
  isFullScreen.value = !!document.fullscreenElement
}

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullScreenChange)
  document.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullScreenChange)
  document.removeEventListener('keydown', handleKeydown)
})

defineExpose<Expose>({
  play,
  pause,
  showCover,
  hideCover,
  endCurrentSegment,
  enterFullScreen,
  exitFullScreen
})
</script>

<style lang="scss" scoped>
.video-player-container {
  position: relative;
  width: 100%;
  background: #000;
  overflow: hidden;

  display: flex;
  align-items: center; // 垂直居中视频
  justify-content: center;
  video {
    width: 100%;
    display: block;
    pointer-events: auto;
  }

  // 视频暂停显示播放操作图标
  .pause-center-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none; // 不阻止视频的点击事件
    cursor: pointer;
    img {
      width: 80px;
      height: 80px;
      opacity: 0.8;
    }
  }

  // 自定义进度条
  .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 35px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
    opacity: 0;
    transform: translateY(100%);
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;

    &.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .progress-track {
      position: relative;
      flex: 1;
      height: 4px;
      background: #fff;
      margin: 0 5px;
      border-radius: 2px;

      .progress-fill {
        position: absolute;
        height: 100%;
        background: #0ec1d0;
        width: 0%;
        border-radius: inherit;
      }

      .segment-dot {
        position: absolute;
        top: -2px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #f9a134;
        transform: translateX(-50%);
      }
    }

    // 播放按钮和暂停按钮
    .play-button,
    .pause-button {
      width: 15px;
      height: 15px;
      position: absolute;
      left: 10px;
      top: 10px;
      cursor: pointer;
      img {
        width: 100%;
        height: 100%;
      }
    }

    // 全屏按钮和缩小按钮
    .fullscreen-button,
    .minimize-button {
      width: 15px;
      height: 15px;
      position: absolute;
      right: 10px;
      top: 10px;
      cursor: pointer;
      img {
        width: 100%;
        height: 100%;
      }
    }

    // 播放时长显示
    .play-time {
      position: absolute;
      left: 40px;
      top: 12px;
      color: #fff;
      font-size: 12px;
    }
  }

  // 封面覆盖区域
  .cover-overlay {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    overflow: auto;
  }
}
</style>
