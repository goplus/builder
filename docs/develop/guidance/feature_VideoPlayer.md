```vue
<!-- VideoPlayer.vue -->
<script lang="ts" setup>
/** Props：视频地址与分段点信息 */
const props = defineProps<{
  videoUrl: string
  segments: Segment[]
}>()

/** Emits：对外触发的事件
 *  - 'segment-reached': 当视频播放到分段点时触发，传入当前分段点信息；
 */
const emit = defineEmits<{
  (e: 'segmentReached', segment: Segment): void
}>()

// 引用视频元素
const videoRef = ref<HTMLVideoElement | null>(null)
// 是否展示封面（当视频暂停执行特定事件时）
const coverVisible = ref(false)

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

function showCover(){
  coverVisible.value = true;
}
function hideCover(){
  coverVisible.value = false;
}

/** 对外暴露方法，便于父组件通过 ref 访问视频控制接口 */
defineExpose({
  play: playVideo,
  pause: pauseVideo,
  showCover,
  hideCover
})
</script>
```