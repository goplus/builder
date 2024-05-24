import { computed, ref, watchEffect } from 'vue'

let audioContext: AudioContext

// Reuse single AudioContext instance, see details in https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
// > It's recommended to create one AudioContext and reuse it instead of initializing a new one each time,
// > and it's OK to use a single AudioContext for several different audio sources and pipeline concurrently.
function getAudioContext() {
  if (audioContext == null) audioContext = new AudioContext()
  return audioContext
}

/** Convert arbitrary-type (supported by current browser) audio content to type-`audio/wav` content. */
export async function toWav(ab: ArrayBuffer): Promise<ArrayBuffer> {
  const audioBuffer = await getAudioContext().decodeAudioData(ab)
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
    }),
    formattedDurationSeconds: computed(() => {
      if (duration.value === null || duration.value === Infinity) {
        return ''
      }
      return duration.value.toFixed(1) + 's'
    })
  }
}

export async function trimAndApplyGain(
  webmBlob: Blob,
  startRatio: number,
  endRatio: number,
  gainValue: number
): Promise<Blob> {
  // Ensure ratios are between 0.0 and 1.0
  if (
    startRatio < 0.0 ||
    startRatio > 1.0 ||
    endRatio < 0.0 ||
    endRatio > 1.0 ||
    startRatio >= endRatio
  ) {
    throw new Error('Invalid start or end ratio')
  }

  const audioContext = new AudioContext()
  const arrayBuffer = await webmBlob.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  let trimmedBuffer: AudioBuffer

  if (startRatio === 0 && endRatio === 1) {
    // No trimming needed
    trimmedBuffer = audioBuffer
  } else {
    const startTime = audioBuffer.duration * startRatio
    const endTime = audioBuffer.duration * endRatio

    const numChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const startSample = Math.floor(startTime * sampleRate)
    const endSample = Math.floor(endTime * sampleRate)
    const newLength = endSample - startSample

    trimmedBuffer = audioContext.createBuffer(numChannels, newLength, sampleRate)

    for (let channel = 0; channel < numChannels; channel++) {
      const oldChannelData = audioBuffer.getChannelData(channel)
      const newChannelData = trimmedBuffer.getChannelData(channel)
      for (let i = 0; i < newLength; i++) {
        newChannelData[i] = oldChannelData[i + startSample]
      }
    }
  }

  // Apply gain to the (trimmed or original) audio
  const offlineContext = new OfflineAudioContext(
    trimmedBuffer.numberOfChannels,
    trimmedBuffer.length,
    trimmedBuffer.sampleRate
  )
  const source = offlineContext.createBufferSource()
  source.buffer = trimmedBuffer

  const gainNode = offlineContext.createGain()
  gainNode.gain.value = gainValue

  source.connect(gainNode)
  gainNode.connect(offlineContext.destination)

  source.start()

  const renderedBuffer = await offlineContext.startRendering()
  return bufferToWebmBlob(renderedBuffer, audioContext)
}

function bufferToWebmBlob(buffer: AudioBuffer, audioContext: AudioContext): Promise<Blob> {
  return new Promise((resolve) => {
    const destination = audioContext.createMediaStreamDestination()
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(destination)
    source.start(0)

    const mediaRecorder = new MediaRecorder(destination.stream)
    const chunks: BlobPart[] = []

    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data)
    }

    mediaRecorder.onstop = () => {
      const webmBlob = new Blob(chunks, { type: 'audio/webm' })
      resolve(webmBlob)
    }

    mediaRecorder.start()
    source.onended = () => {
      mediaRecorder.stop()
    }
  })
}
