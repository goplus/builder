```vue
<!-- VideoPlayer.vue -->
<template>
  <div class="video-player">
    <!-- 视频元素（不使用浏览器默认的控制条，避免拖拽/跳转） -->
    <video 
      ref="videoRef"
      :src="videoUrl"
      @timeupdate="handleTimeUpdate"
      controls="false"
    ></video>

    <!-- 自定义进度条，展示各分段点 -->
    <div class="progress-bar">
      <div 
        v-for="(segment, index) in segments" 
        :key="index" 
        class="segment-marker"
        :style="{ left: (segment.time / videoDuration * 100) + '%' }"
      ></div>
    </div>

    <!-- 展示封面：封面的具体 UI 由外部通过具名插槽传入 -->
    <div v-if="showCover" class="cover">
      <slot name="cover"></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits, defineExpose, ref } from 'vue'

/** 定义单个分段点的数据结构 */
interface Segment {
  /** 分段点所在的时间（单位：秒） */
  time: number
  // 可根据需要扩展其他属性
}

/** Props：视频地址与分段点信息 */
const props = defineProps<{
  videoUrl: string
  segments: Segment[]
}>()

/** Emits：对外触发的事件
 *  - 'segment-reached': 当视频播放到分段点时触发，传入当前分段点信息；
 */
const emit = defineEmits<{
  (e: 'segment-reached', segment: Segment): void
}>()

// 引用视频元素
const videoRef = ref<HTMLVideoElement | null>(null)
// 是否展示封面（当视频暂停执行特定事件时）
const showCover = ref(false)
// 保存视频总时长（用于计算进度条比例）
const videoDuration = ref(1)
// 用于记录已触发的分段点，防止重复触发
const triggeredSegmentIndex = ref(-1)

/** 播放视频 */
function playVideo() {
  if (videoRef.value) {
    videoRef.value.play()
  }
}

/** 暂停视频 */
function pauseVideo() {
  if (videoRef.value) {
    videoRef.value.pause()
  }
}

function coverShow(){
  showCover.value = true;
}
function coverHide(){
  showCover.value = false;
}

/** 处理视频时间更新事件，判断是否到达某个分段点 */
function handleTimeUpdate() {
  if (!videoRef.value) return
  const currentTime = videoRef.value.currentTime

  // 如果视频时长还未设置，则取视频的 duration
  if (videoRef.value.duration && videoDuration.value === 1) {
    videoDuration.value = videoRef.value.duration
  }
   
  // 遍历所有分段点，判断是否需要暂停并执行特定事件
  props.segments.forEach((segment, index) => {
    // 当当前播放时间达到分段点且该分段点还未触发
    if (currentTime >= segment.time && index > triggeredSegmentIndex.value) {
      // // 暂停视频，禁止视频继续播放
      // pauseVideo()
      // showCover.value = true
      triggeredSegmentIndex.value = index
      // 通知外部：当前分段点已到达，可以在外部执行对应的特定事件
      emit('segment-reached', segment)
    }
  })
}

/** 对外暴露方法，便于父组件通过 ref 访问视频控制接口 */
defineExpose({
  play: playVideo,
  pause: pauseVideo,
  coverShow,
  coverHide
})
</script>
```