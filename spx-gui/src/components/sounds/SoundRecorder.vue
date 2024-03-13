<template>
  <div v-if="showRecorder" class="modal">
    <div class="modal-content">
      <div class="close-button" @click="closeRecorder">
        <span class="close-button-text"> × </span>
      </div>
      <div class="recorder-waveform-container">
        <div ref="waveformContainer" class="recorder-waveform"></div>
      </div>
      <div class="name-input-container">
        <span class="name-input-hint"> {{ $t('sounds.soundName') }} </span>
        <input
          v-model="soundName"
          type="text"
          class="sound-name-input"
        />
      </div>
      <audio :src="audioUrl" controls></audio>
      <div class="button-container">
        <button class="recorder-button" @click="startRecording">{{ $t('sounds.startRecording') }}</button>
        <button class="recorder-button" @click="stopRecording">{{ $t('sounds.stopRecording') }}</button>
        <button class="recorder-button" @click="saveRecording">{{ $t('sounds.save') }}</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import WaveSurfer from 'wavesurfer.js'
import MicrophonePlugin from 'wavesurfer.js/src/plugin/microphone'
import { defineEmits, defineProps, nextTick, onMounted, ref, watch } from 'vue'
import { useSoundStore } from 'store/modules/sound'
import { Sound } from '@/class/sound'
import { audioBufferToWavBlob, convertAudioChunksToAudioBuffer } from '@/util/audio'

interface PropsType {
  show: boolean;
}
const props = defineProps<PropsType>();
const emits = defineEmits(["update:show"]);

const showRecorder = ref<boolean>(false);
const soundName = ref('record');
const audioUrl = ref('');
let mediaRecorder : MediaRecorder;
const audioChunks = ref<Blob[]>([]);
const audioFile = ref<File | null>(null);
let wavesurfer: WaveSurfer;
const waveformContainer = ref(null);

const soundStore = useSoundStore();

onMounted(() => {
  nextTick(() => {
    initWaveSurfer();
  });
});


const initWaveSurfer = () => {
  nextTick(() => {
    if (waveformContainer.value) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 0, 150)
      gradient.addColorStop(0, 'rgb(255,223,232)')
      gradient.addColorStop(1, 'rgb(255,114,142)')

      wavesurfer =  WaveSurfer.create({
        container: waveformContainer.value,
        splitChannels: false,
        waveColor: gradient,
        progressColor: 'rgb(224,213,218)',
        cursorColor: 'rgb(229,29,100)',
        cursorWidth: 0,
        minPxPerSec: 100,
        barGap: 3,
        barHeight: 2,
        barMinHeight: 2,
        barWidth: 4,
        plugins: [
          MicrophonePlugin.create({})
        ]
      });
      wavesurfer.microphone.on('deviceReady', (stream) => {
        console.log('Device ready', stream);
      });
      wavesurfer.microphone.on('deviceError', (code) => {
        console.warn('Device error:', code);
      });
    }
  })
}

/* Start recording*/
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.value.push(event.data);
    };
    mediaRecorder.start();
    wavesurfer.microphone.start();
  } catch (err) {
    console.error('Error accessing the microphone', err);
  }
};

/* Stop recording*/
const stopRecording = () => {
  mediaRecorder.stop();
  wavesurfer.microphone.stop();
  mediaRecorder.onstop = () => {
    if (audioChunks.value.length > 0) {
      // AudioChunks -> AudioBuffer -> correct wav blob
      convertAudioChunksToAudioBuffer(audioChunks.value, 'audio/webm' ).then(audioBuffer => {
        audioFile.value = new File([audioBufferToWavBlob(audioBuffer)], soundName.value + ".wav", {
          type: "audio/wav",
          lastModified: Date.now(),
        });
        audioUrl.value = URL.createObjectURL(audioFile.value);
      });
    } else {
      console.error('No audio chunks available to create audio file.');
    }
    audioChunks.value = [];
  };
};

/* Save audioFile to file manager */
const saveRecording = () => {
  if (audioFile.value && soundName.value) {
    let sound = new Sound(soundName.value, [audioFile.value]);
    soundStore.addItem(sound);
    closeRecorder();
  } else {
    console.error('No recording or name provided');
  }
};


watch(props, (newProps) => {
  showRecorder.value = newProps.show;
  if (newProps.show) {
    initWaveSurfer();
  }
});

const closeRecorder = () => {
  emits("update:show", false);
};

</script>


<style lang="scss"  scoped>
.modal {
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  z-index: 10001;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
}

.modal-content {
  display: flex;
  flex-direction: column;
  background-color: #fefefe;
  padding: 20px;
  width: 80%;
  max-width: 500px;
  min-height: 300px;
  max-height: 90vh;
  border-radius: 15px;
}

.close-button {
  color: #aaaaaa;
  float: right;
  position: fixed;
  font-weight: bold;
  align-self: flex-end;
  margin-top: -30px;
}
.close-button:hover,
.close-button:focus {
  color: #000;
  text-decoration: none;
  cursor: pointer;
}
.close-button-text {
  font-size: 50px;
}

.recorder-waveform-container {
  border: 1px dashed #b99696;
  margin-top: 30px;
  padding-top: 1px;
}

.recorder-waveform {
  width: 99%;
  height: 129px;
}

.name-input-container {
  margin-top: 20px;
  margin-bottom: 20px;
  width: 50%;
}

.name-input-hint {
  color: gray;
  margin-right: 5px;
}

.sound-name-input {
  font-size: 14px;
  height: 30px;
  width: 50%;
  padding-left: 10px;
  border-radius: 10px;
  border: 1px solid #ccc;
}

.button-container {
  display: flex;
  margin-top: 20px;
}

.recorder-button {
  border: none;
  background-color: #eb99af;
  color: white;
  padding: 8px 13px;
  border-radius: 20px;
  margin-right: 10px;
  font-size: 14px;
  &:hover {
    background-color: #e0759b;
    cursor: pointer;
  }
}

</style>
