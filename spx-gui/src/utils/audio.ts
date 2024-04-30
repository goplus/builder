import { computed, ref, watchEffect } from 'vue'

const audioContext = new AudioContext()

/** Convert arbitrary-type (supported by current browser) audio content to type-`audio/wav` content. */
export async function toWav(ab: ArrayBuffer): Promise<ArrayBuffer> {
  const audioBuffer = await audioContext.decodeAudioData(ab)
  const numOfChan = audioBuffer.numberOfChannels
  const length = audioBuffer.length * numOfChan * 2 + 44
  const buffer = new ArrayBuffer(length)
  const view = new DataView(buffer)
  const channels = []
  let i
  let sample
  let offset = 0
  let pos = 0

  setUint32(0x46464952)
  setUint32(length - 8)
  setUint32(0x45564157)

  setUint32(0x20746d66)
  setUint32(16)
  setUint16(1)
  setUint16(numOfChan)
  setUint32(audioBuffer.sampleRate)
  setUint32(audioBuffer.sampleRate * 2 * numOfChan)
  setUint16(numOfChan * 2)
  setUint16(16)

  setUint32(0x61746164)
  setUint32(length - pos - 4)

  for (i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i))
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]))
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0
      view.setInt16(pos, sample, true)
      pos += 2
    }
    offset++
  }
  function setUint16(data: any) {
    view.setUint16(pos, data, true)
    pos += 2
  }
  function setUint32(data: any) {
    view.setUint32(pos, data, true)
    pos += 4
  }
  return buffer
}

const formatDuration = (seconds: number): string => {
  const minutes: number = Math.floor(seconds / 60)
  const remainingSeconds: number = Math.floor(seconds % 60)
  const formattedSeconds: string =
    remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`
  return `${minutes}:${formattedSeconds}`
}

export const useAudioDuration = (audio: () => string | Blob | null) => {
  const duration = ref<number | null>(null)
  watchEffect(() => {
    const srcOrBlob = audio()
    if (!srcOrBlob) {
      duration.value = null
      return
    }
    const src = typeof srcOrBlob === 'string' ? srcOrBlob : URL.createObjectURL(srcOrBlob)
    const audioElement = document.createElement('audio')
    audioElement.src = src
    audioElement.onloadedmetadata = () => {
      duration.value = audioElement.duration
      if (typeof srcOrBlob !== 'string') {
        URL.revokeObjectURL(src)
      }
    }
    if (typeof srcOrBlob !== 'string') {
      audioElement.onerror = () => {
        URL.revokeObjectURL(src)
      }
    }
  })
  return {
    duration,
    formattedDuration: computed(() => {
      if (duration.value === null || duration.value === Infinity) {
        return ''
      }
      return formatDuration(duration.value)
    })
  }
}
