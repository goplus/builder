<template>
  <div class="video-recorder">
    <h2>
      {{ $t({ en: 'Video Recorder', zh: '视频录制' }) }}
    </h2>

    <video ref="videoRef" autoplay></video>

    <div class="controlBtn">
      <UIButton size="large" @click="startRecording">
        {{ $t({ en: 'start recording', zh: '开始录制' }) }}
      </UIButton>
      <UIButton size="large" @click="stopRecording">
        {{ $t({ en: 'stop recording', zh: '停止录制' }) }}
      </UIButton>
    </div>

    <video v-if="recordedBlobUrl" ref="recordedVideo" controls :src="recordedBlobUrl"></video>

    <a :href="recordedBlobUrl" download="recorded-video.webm" v-if="recordedBlobUrl">
      {{ $t({ en: 'Download', zh: '下载' }) }}
    </a>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, type Ref} from 'vue';
import { UIButton } from '@/components/ui';

const mediaStream: Ref<MediaStream | null> = ref(null);
const mediaRecorder: Ref<MediaRecorder | null> = ref(null);
const recordedChunks: Ref<Blob[]> = ref([]);
const recordedBlobUrl: Ref<string | null> = ref(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const recordedVideoRef = ref<HTMLVideoElement | null>(null);

const startCamera = async () => {
  try {
    mediaStream.value = await navigator.mediaDevices.getUserMedia({
      video: true, 
      audio: true, 
    });
    
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream.value;
    }
  } catch (error) {
    console.error('无法访问摄像头:', error);
  }
};

const startRecording = () => {
  if (mediaStream.value) {
    recordedChunks.value = []; 
    mediaRecorder.value = new MediaRecorder(mediaStream.value);

    mediaRecorder.value.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        recordedChunks.value.push(event.data);
      }
    };

    mediaRecorder.value.onstop = () => {
      const recordedBlob = new Blob(recordedChunks.value, { type: 'video/webm' });
      recordedBlobUrl.value = URL.createObjectURL(recordedBlob);
      if (recordedVideoRef.value) {
        recordedVideoRef.value.src = recordedBlobUrl.value;
      }
    };

    mediaRecorder.value.start();
  }
};

const stopRecording = () => {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop();
  }
};

onMounted(() => {
  startCamera();
});

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
