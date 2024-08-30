<template>
  <div class="video-recorder">
    <h2>
      {{ $t({ en: 'Video Recorder', zh: '视频录制' }) }}
    </h2>

    <!-- 显示摄像头实时视频 -->
    <video ref="videoRef" autoplay></video>

    <!-- 控制按钮 -->
    <div class="controlBtn">
      <UIButton size="large" @click="startRecording">
        {{ $t({ en: 'start recording', zh: '开始录制' }) }}
      </UIButton>
      <UIButton size="large" @click="stopRecording">
        {{ $t({ en: 'stop recording', zh: '停止录制' }) }}
      </UIButton>
    </div>

    <!-- 显示录制的视频 -->
    <video v-if="recordedBlobUrl" ref="recordedVideo" controls :src="recordedBlobUrl"></video>

    <!-- 下载按钮 -->
    <a :href="recordedBlobUrl" download="recorded-video.webm" v-if="recordedBlobUrl">下载视频</a>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, type Ref} from 'vue';
import { UIButton } from '@/components/ui';

// 定义响应式变量和引用
const mediaStream: Ref<MediaStream | null> = ref(null);
const mediaRecorder: Ref<MediaRecorder | null> = ref(null);
const recordedChunks: Ref<Blob[]> = ref([]);
const recordedBlobUrl: Ref<string | null> = ref(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const recordedVideoRef = ref<HTMLVideoElement | null>(null);

// 启动摄像头并显示实时视频
const startCamera = async () => {
  try {
    mediaStream.value = await navigator.mediaDevices.getUserMedia({
      video: true, // 启用摄像头
      audio: true, // 启用麦克风（可选）
    });
    
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream.value;
    }
  } catch (error) {
    console.error('无法访问摄像头:', error);
  }
};

// 开始录制视频
const startRecording = () => {
  if (mediaStream.value) {
    recordedChunks.value = []; // 清空已录制的数据块
    mediaRecorder.value = new MediaRecorder(mediaStream.value);

    // 当有数据可用时，向 recordedChunks 数组推入数据
    mediaRecorder.value.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        recordedChunks.value.push(event.data);
      }
    };

    // 录制停止时生成 Blob 并创建可下载链接
    mediaRecorder.value.onstop = () => {
      const recordedBlob = new Blob(recordedChunks.value, { type: 'video/webm' });
      recordedBlobUrl.value = URL.createObjectURL(recordedBlob);
      if (recordedVideoRef.value) {
        recordedVideoRef.value.src = recordedBlobUrl.value;
      }
    };

    // 开始录制
    mediaRecorder.value.start();
  }
};

// 停止录制视频
const stopRecording = () => {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop();
  }
};

// 组件挂载时启动摄像头
onMounted(() => {
  startCamera();
});

// 组件销毁前停止摄像头
onBeforeUnmount(() => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => track.stop());
  }
});
</script>

<style scoped>
.video-recorder {
  text-align: center;
  margin-top: 20px;
}
.controlBtn {
  margin: 20px 0;
  display: flex;
  justify-content: center;
}
video {
  width: 80%;
  max-width: 600px;
  margin-bottom: 20px;
}
button {
  margin: 5px;
}
</style>
