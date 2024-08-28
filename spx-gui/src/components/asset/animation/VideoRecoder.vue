<template>
  <div class="video-recorder">
    <h2>摄像头视频录制</h2>

    <!-- 显示摄像头实时视频 -->
    <video ref="video" autoplay></video>

    <!-- 控制按钮 -->
    <div>
      <button @click="startRecording">开始录制</button>
      <button @click="stopRecording">停止录制</button>
    </div>

    <!-- 显示录制的视频 -->
    <video ref="recordedVideo" controls v-if="recordedBlobUrl"></video>

    <!-- 下载按钮 -->
    <a :href="recordedBlobUrl" download="recorded-video.webm" v-if="recordedBlobUrl">下载视频</a>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

// 定义响应式变量和引用
const mediaStream = ref(null);
const mediaRecorder = ref(null);
const recordedChunks = ref([]);
const recordedBlobUrl = ref(null);
const videoRef = ref(null);
const recordedVideoRef = ref(null);

// 启动摄像头并显示实时视频
const startCamera = async () => {
  try {
    mediaStream.value = await navigator.mediaDevices.getUserMedia({
      video: true, // 启用摄像头
      audio: true, // 启用麦克风（可选）
    });
    videoRef.value.srcObject = mediaStream.value;
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
    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.value.push(event.data);
      }
    };

    // 录制停止时生成 Blob 并创建可下载链接
    mediaRecorder.value.onstop = () => {
      const recordedBlob = new Blob(recordedChunks.value, { type: 'video/webm' });
      recordedBlobUrl.value = URL.createObjectURL(recordedBlob);
      recordedVideoRef.value.src = recordedBlobUrl.value;
    };

    // 开始录制
    mediaRecorder.value.start();
    console.log('开始录制...');
  }
};

// 停止录制视频
const stopRecording = () => {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop();
    console.log('停止录制');
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
video {
  width: 80%;
  max-width: 600px;
  margin-bottom: 20px;
}
button {
  margin: 5px;
}
</style>
