<template>
  <!--  Title And Operations-->
  <div class="sound-edit-content">
    <div class="sound-edit-content-top">
    <span class="text-sound">
       <n-gradient-text type="danger">
         <div class="sounds-hint">{{ $t('sounds.hint') }}</div>
       </n-gradient-text>
    </span>
      <n-input
          v-model:value="soundName"
          size="small"
          round
          :placeholder="props.asset?.name || ''"
          class="sound-edit-content-top-input-sound-name"
          @blur="() => emits('update-sound-name', soundName)"
      />
      <!--   Speed Change   -->
      <div class="speed-change-container" @click="togglePlaybackSpeed()">
        <div class="speed-change-container-text">{{ currentSpeed }}x</div>
      </div>
      <!--   Undo && ReUndo   -->
      <div class="sound-icon-container" :class="{ 'disabled': isOperateDisabled.backout }">
        <button :disabled="isOperateDisabled.backout" @click="handleOperate('backout')">
          <img v-if="!isOperateDisabled.backout" class="sound-icon-with-text" src="@/assets/icon/sound/undo.svg"/>
          <img v-else class="sound-icon-with-text" src="@/assets/icon/sound/undo-unable.svg"/>
        </button>
        <div class="sound-icon-text">{{ $t('sounds.undo') }}</div>
      </div>
      <div class="sound-icon-container" :class="{ 'disabled': isOperateDisabled.renewal }">
        <button :disabled="isOperateDisabled.renewal" @click="handleOperate('renewal')">
          <img v-if="!isOperateDisabled.renewal" class="sound-icon-with-text" src="@/assets/icon/sound/reUndo.svg"/>
          <img v-else class="sound-icon-with-text" src="@/assets/icon/sound/reUndo-unable.svg"/>
        </button>
        <div class="sound-icon-text">{{ $t('sounds.reUndo') }}</div>
      </div>
      <div class="vertical-dashed-line-short"></div>
      <!--   Download And Save -->
      <div class="sound-icon-container">
        <button @click="downloadSound()">
          <img class="sound-icon-with-text" src="@/assets/icon/sound/download.svg"/>
        </button>
        <div class="sound-icon-text">{{ $t('sounds.download') }}</div>
      </div>
      <div class="sound-icon-container">
        <button @click="updateSound()">
          <img class="sound-icon-with-text" src="@/assets/icon/sound/save.svg"/>
        </button>
        <div class="sound-icon-text">{{ $t('sounds.save') }}</div>
      </div>
    </div>
  </div>
  <!--  WaveSurfer Part  -->
  <div class="waveform-content">
    <div id="waveform" class="waveform-container"></div>
    <div id="wave-timeline"></div>
  </div>
  <!--  Operations-->
  <div class="sound-edit-content-bottom">
    <!--  play  -->
    <div>
      <button @click="togglePlayPause()">
        <img v-if="!isPlaying" class="sound-icon" src="@/assets/icon/sound/play.svg"/>
        <img v-else class="sound-icon" src="@/assets/icon/sound/pause.svg" />
      </button>
    </div>
    <div class="vertical-dashed-line-long"></div>
    <!--  play operation  -->
    <div class="sound-icon-container">
      <button @click="backward()">
        <img class="sound-icon-with-text" src="@/assets/icon/sound/backward.svg"/>
      </button>
      <div class="sound-icon-text">{{ $t('sounds.backward') }}</div>
    </div>
    <div class="sound-icon-container">
      <button @click="forward()">
        <img class="sound-icon-with-text" src="@/assets/icon/sound/forward.svg"/>
      </button>
      <div class="sound-icon-text">{{ $t('sounds.forward') }}</div>
    </div>
    <div class="sound-icon-container">
      <button @click="replay()">
        <img class="sound-icon-with-text" src="@/assets/icon/sound/replay.svg"/>
      </button>
      <div class="sound-icon-text">{{ $t('sounds.replay') }}</div>
    </div>
    <div class="vertical-dashed-line-short"></div>
    <!--  Volume  -->
    <div class="sound-icon-container">
      <button @click="increaseVolume()">
        <img class="sound-icon-with-text" src="@/assets/icon/sound/volume-high.svg"/>
      </button>
      <div class="sound-icon-text">{{ $t('sounds.volumeHigh') }}</div>
    </div>
    <div class="sound-icon-container">
      <button @click="decreaseVolume()">
        <img class="sound-icon-with-text" src="@/assets/icon/sound/volume-low.svg"/>
      </button>
      <div class="sound-icon-text">{{ $t('sounds.volumeLow') }}</div>
    </div>
    <div class="sound-icon-container">
      <button @click="mute()">
        <img class="sound-icon-with-text" src="@/assets/icon/sound/mute.svg"/>
      </button>
      <div class="sound-icon-text">{{ $t('sounds.mute') }}</div>
    </div>
    <div class="vertical-dashed-line-short"></div>
    <!--  Edit  -->
    <div class="sound-icon-container" :class="{ 'disabled': isOperateDisabled.remove }">
      <button :disabled="isOperateDisabled.remove" @click="handleOperate('remove')">
        <img v-if="!isOperateDisabled.remove" class="sound-icon-with-text" src="@/assets/icon/sound/delete.svg"/>
        <img v-else class="sound-icon-with-text" src="@/assets/icon/sound/delete-unable.svg"/>
      </button>
      <div class="sound-icon-text">{{ $t('sounds.delete') }}</div>
    </div>
    <div class="sound-icon-container" :class="{ 'disabled': isOperateDisabled.cut }">
      <button :disabled="isOperateDisabled.cut" @click="handleOperate('cut')">
        <img v-if="!isOperateDisabled.cut" class="sound-icon-with-text" src="@/assets/icon/sound/cut.svg"/>
        <img v-else class="sound-icon-with-text" src="@/assets/icon/sound/cut-unable.svg"/>
      </button>
      <div class="sound-icon-text">{{ $t('sounds.cut') }}</div>
    </div>
    <div class="sound-icon-container" :class="{ 'disabled': isOperateDisabled.copy }">
      <button :disabled="isOperateDisabled.copy" @click="handleOperate('copy')">
        <img v-if="!isOperateDisabled.copy" class="sound-icon-with-text" src="@/assets/icon/sound/copy.svg"/>
        <img v-else class="sound-icon-with-text" src="@/assets/icon/sound/copy-unable.svg"/>
      </button>
      <div class="sound-icon-text">{{ $t('sounds.copy') }}</div>
    </div>
    <div class="sound-icon-container" :class="{ 'disabled': isOperateDisabled.paste }">
      <button :disabled="isOperateDisabled.paste" @click="handleOperate('paste')">
        <img v-if="!isOperateDisabled.paste" class="sound-icon-with-text" src="@/assets/icon/sound/paste.svg"/>
        <img v-else class="sound-icon-with-text" src="@/assets/icon/sound/paste-unable.svg"/>
      </button>
      <div class="sound-icon-text">{{ $t('sounds.paste') }}</div>
    </div>
    <div class="sound-icon-container" :class="{ 'disabled': isOperateDisabled.insert }">
      <button :disabled="isOperateDisabled.insert" @click="handleOperate('insert')">
        <img v-if="!isOperateDisabled.insert" class="sound-icon-with-text" src="@/assets/icon/sound/insert.svg"/>
        <img v-else class="sound-icon-with-text" src="@/assets/icon/sound/insert-unable.svg"/>
      </button>
      <div class="sound-icon-text">{{ $t('sounds.insert') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/src/plugin/timeline';
import RegionsPlugin from 'wavesurfer.js/src/plugin/regions';
import CursorPlugin from 'wavesurfer.js/src/plugin/cursor';
import { ref, onMounted, type Ref, watch } from 'vue'
import { nextTick } from "vue";
import { type SimpleWavesurferBackend, WavesurferEdit } from '@/util/wavesurfer-edit'
import { NGradientText, NInput, useMessage, type MessageApi } from "naive-ui";
import { Sound } from '@/class/sound'
import { audioDataService } from '@/util/wavesurfer-edit-data'
import { audioBufferToWavBlob } from '@/util/audio'

const props = defineProps({
  asset: {
    type: Sound,
    required: false,
    default: null
  }
})

const emits = defineEmits(['update-sound-file', 'update-sound-name']);

interface WaveSurferInstance {
  destroy(): void;
}
const soundName = ref(props.asset?.name || '');
const waveSurfer = ref<WaveSurferInstance | null>(null);
const message: MessageApi = useMessage();
let wavesurfer: WaveSurfer;
let isPlaying: Ref<boolean> = ref(false);
let currentSpeedIndex: number = 1;
const playbackSpeeds: number[] = [0.5, 1.0, 1.25, 1.5, 2.0, 4.0];
let currentSpeed: Ref<number> = ref(1.0);
let buffer: AudioBuffer | null = null;
let currentRegion: any = null;
let soundEditor: WavesurferEdit | null = null;
const isOperateDisabled: Ref<{ [key: string]: boolean }> = ref({
  copy: true,
  paste: true,
  insert: true,
  cut: true,
  remove: true,
  backout: true,
  renewal: true,
  download: true
});

onMounted(() => {
  initSoundEdit();
});

const initSoundEdit = () => {
  // Make sure that wavesurfer does not stack after each update
  if (waveSurfer.value) {
    waveSurfer.value.destroy();
    waveSurfer.value = null;
  }
  const waveformContainer = document.querySelector('#waveform');
  if (waveformContainer) {
    waveformContainer.innerHTML = '';
  }
  initWaveSurfer();
  isRegionOptionDisabled();
}

/* init WaveSurfer */
const initWaveSurfer = () => {
  // nextTick : Make sure waveform dom is loaded
  nextTick(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 150)
    gradient.addColorStop(0, 'rgb(255,223,232)')
    gradient.addColorStop(1, 'rgb(255,114,142)')

    wavesurfer =  WaveSurfer.create({
      container: '#waveform',
      splitChannels: false,
      waveColor: gradient,
      progressColor: 'rgb(224,213,218)',
      cursorColor: 'rgb(229,29,100)',
      cursorWidth: 4,
      minPxPerSec: 100,
      barGap: 3,
      barHeight: 1,
      barMinHeight: 2,
      barWidth: 4,
      plugins: [
        TimelinePlugin.create({
          container: '#wave-timeline',
          height: 10,
          notchPercentHeight: 90,
          labelPadding: 5,
          primaryColor: '#ffffff',
          secondaryColor: '#f79e9e',
          primaryFontColor: '#ffffff',
          secondaryFontColor: '#f79e9e',
          labelInterval: 10,
          timeInterval: () => 10,
          formatTimeCallback: function(seconds: number) {
            return new Date(seconds * 1000).toISOString().substr(14, 5);
          }
        }),
        RegionsPlugin.create({
          dragSelection: true,
          color: 'rgba(252,161,169,0.58)',
          handleStyle: {
            left: {
              borderRadius: '10px',
              border: '2px solid rgb(233, 11, 22)',
              backgroundColor: 'rgb(231,93,102)'
            },
            right: {
              borderRadius: '10px',
              border: '2px solid rgb(233, 11, 22)',
              backgroundColor: 'rgb(231,93,102)'
            }
          }
        }),
        CursorPlugin.create({
          showTime: true,
          opacity: "1",
          customShowTimeStyle: {
            borderRadius: '5px',
            background: '#fff',
            color:'#2e2e31',
            padding: "4px",
            fontSize: '14px',
            marginLeft: '5px'
          },
          content: "hihi"
        })
      ],
    });

    // load sound
    if (props.asset) {
      console.log(props.asset?.files[0])
      wavesurfer.loadBlob(props.asset?.files[0]);
    } else {
      return
    }

    wavesurfer.on('ready', () => {
      const backend = wavesurfer.backend as SimpleWavesurferBackend;
      if (backend.buffer && backend.ac) {
        soundEditor = new WavesurferEdit({
          buffer: backend.buffer,
          ac: backend.ac,
          maxCount: 20,
        });
      }
    });
    wavesurfer.on('play', () => {
      isPlaying.value = true;
    });
    wavesurfer.on('pause', () => {
      isPlaying.value = false;
    });
    wavesurfer.on('region-click', (region: any, e: Event) => {
      region.play();
      e.stopPropagation();
      currentRegion = region;
    });
    wavesurfer.on('region-updated', (region: any) => {
      currentRegion = region;
      removeRegion(region);
    });
    wavesurfer.on('region-update-end', (region: any) => {
      currentRegion = region;
      isRegionOptionDisabled();
    });
  })
}

function handleOperate(e: string) : void {
  let val = null;
  let timeArr = ['paste', 'insert'];
  if (timeArr.includes(e)) val = wavesurfer!.getCurrentTime();
  else val = currentRegion;
  let res = (soundEditor as any)[e](val);
  if (!res) return;
  showMessage(e);
  isOperateDisabled.value.backout = res.curIndex <= 0;
  isOperateDisabled.value.renewal = res.curIndex >= res.maxIndex - 1;
  if (e !== 'copy') {
    buffer = res.buffer;
    renderWavesurfer();
  }
  if (e === 'cut' || e === 'remove') {
    removeRegion();
  }
}

/* Show hint message like "copy successfully!" */
function showMessage(e: string):void {
  if (e === 'copy') {
    message.success(
        e + ' successfully!',
        { duration: 1000 }
    );
  }
}

/* Purpose: only Retain one region */
function removeRegion(region: any = {}): void {
  if (!Object.keys(region).length) currentRegion = null;
  let regions = wavesurfer!.regions.list;
  for (const key in regions) {
    if (region.id === regions[key].id) continue;
    regions[key].remove();
  }
  isRegionOptionDisabled();
}

/* Whether the copy, cut, and delete buttons are disabled - only enabled when the region is selected  */
function isRegionOptionDisabled(): void {
  isOperateDisabled.value.copy = !currentRegion;
  isOperateDisabled.value.cut = !currentRegion;
  isOperateDisabled.value.remove = !currentRegion;
  isOperateDisabled.value.paste = !audioDataService.getCopyData().data;
  isOperateDisabled.value.insert = !audioDataService.getCopyData().data;
}

/* Render wavesurfer */
function renderWavesurfer(): void {
  (wavesurfer!.backend as any).load(buffer);
  wavesurfer!.drawBuffer();
}

/* Toggle play and pause */
function togglePlayPause(): void {
  if (wavesurfer.isPlaying()) {
    wavesurfer['pause']();
  } else {
    wavesurfer['play']();
  }
  isPlaying.value = wavesurfer.isPlaying();
}

/* Toggle play speed in [0.5, 1.0, 1.25, 1.5, 2.0, 4.0] */
function togglePlaybackSpeed(): void {
  currentSpeedIndex = (currentSpeedIndex + 1) % playbackSpeeds.length;
  currentSpeed.value = playbackSpeeds[currentSpeedIndex];
  wavesurfer.setPlaybackRate(currentSpeed.value);
}

/* Increase volume 10% */
function increaseVolume(): void {
  const currentVolume = wavesurfer.getVolume()
  if (currentVolume < 1) {
    let newVolume = currentVolume + 0.1
    if (newVolume > 1) newVolume = 1;
    wavesurfer.setVolume(newVolume);
  }
}

/* Decrease volume 10% */
function decreaseVolume(): void {
  const currentVolume = wavesurfer.getVolume()
  if (currentVolume > 0) {
    let newVolume = currentVolume - 0.1
    if (newVolume < 0) newVolume = 0;
    wavesurfer.setVolume(newVolume);
  }
}

/* Mute the sound */
function mute(): void {
  if (wavesurfer.getVolume() > 0) {
    wavesurfer.setVolume(0);
  } else {
    wavesurfer.setVolume(1);
  }
}

/* Replay the sound */
function replay(): void {
  wavesurfer.stop();
  wavesurfer.play();
}

/* Forward 5s */
function forward(): void {
  wavesurfer.skip(5)
}

/* Backward 5s */
function backward(): void {
  wavesurfer.skip(-5)
}

/* Update sound */
async function updateSound(): Promise<void> {
  const backend = wavesurfer.backend as SimpleWavesurferBackend;
  if (backend && backend.buffer) {
    const wavBlob = audioBufferToWavBlob(backend.buffer);
    const wavFile = wavBlobToFile(wavBlob, props.asset?.name + ".wav");
    emits('update-sound-file', wavFile);
  }
}

/* Convert WAV Blob to File */
function wavBlobToFile(wavBlob: Blob, fileName: string): File {
  return new File([wavBlob], fileName, { type: 'audio/wav' });
}

/* Download sound file */
function downloadSound(): void {
  const backend = wavesurfer.backend as SimpleWavesurferBackend;
  if (backend && backend.buffer) {
    downloadAudioBuffer(backend.buffer, props.asset!.name + ".wav");
  }
}

/* Download WAV type sound file */
function downloadAudioBuffer(audioBuffer: AudioBuffer, filename: string): void {
  const blob = audioBufferToWavBlob(audioBuffer);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

watch(() => props.asset?.name, () => {
    soundName.value = props.asset?.name || '';
})

watch(() => props.asset, () => {
  initSoundEdit();
});

</script>

<style scoped>

.vertical-dashed-line-long {
  border: none;
  border-left: 2px dashed #e53b65;
  height: 55px;
}

.vertical-dashed-line-short {
  border: none;
  border-left: 2px dashed #f0bfcb;
  height: 45px;
}

.sounds-hint {
  font-size: 20px;
}

.text-sound {
  margin-left: 5px;
  font-size: 20px;
}

.speed-change-container {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  width: 30px;
  height: 20px;
  border: #f9c3d3 dashed 2px;
  border-radius: 5px;
  color: #e53b65;
  cursor: pointer;
}

.speed-change-container-text {
  font-size: 13px;
}

.sound-edit-content-top {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 25px;
}

.sound-edit-content-top-input-sound-name {
  width: 100px;
  height: 36px;
  font-size: 10px;
}

.waveform-content {
  position: relative;
  z-index: 0;
  margin-top: 30px;
  margin-bottom: 30px;
}

.waveform-container {
  width: 600px;
  background-size: 10px 10px;
  background-image:
    linear-gradient(to right, rgba(244, 187, 187, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(247, 179, 179, 0.1) 1px, transparent 1px);
}

.sound-edit-content-bottom {
  margin-top: 15px;
  display: flex;
  gap: 13px;
}

.sound-icon-container {
  font-size: 18px;
  color: #474343;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sound-icon-container.disabled {
  color: grey;
}

.sound-icon-container button[disabled] {
  pointer-events: none;
}

.sound-icon {
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.sound-icon:hover {
  transform: scale(1.1);
}

.sound-icon-with-text {
  width: 20px;
  height: 20px;
  cursor: pointer;
  transition: transform 0.3s ease-in-out, color 0.3s ease-in-out;
}

.sound-icon-text {
  font-size: 13px;
}

.sound-icon-with-text:hover {
  transform: scale(1.2);
}

.sound-icon-with-text:active {
  filter: drop-shadow(0px 0px 10px rgb(242, 133, 133));
}


button {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

button:focus {
  outline: none;
}


button img {
  display: block;
}


</style>
