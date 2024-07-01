import { computed, ref, watchEffect } from 'vue'

let audioContext: AudioContext

// Reuse single AudioContext instance, see details in https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
// > It's recommended to create one AudioContext and reuse it instead of initializing a new one each time,
// > and it's OK to use a single AudioContext for several different audio sources and pipeline concurrently.
export function getAudioContext() {
  if (audioContext == null) audioContext = new AudioContext()
  return audioContext
}

/** Convert arbitrary-type (supported by current browser) audio content to type-`audio/wav` content. */
export async function toWav(ab: ArrayBuffer): Promise<ArrayBuffer> {
  const audioBuffer = await getAudioContext().decodeAudioData(ab)
  return audioBufferToWav(audioBuffer)
}

function audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
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

export const formatDuration = (
  durationInSeconds: number | null | undefined,
  fractionDigits = 1
) => {
  if (
    durationInSeconds === null ||
    durationInSeconds === undefined ||
    durationInSeconds === Infinity
  ) {
    return ''
  }
  return durationInSeconds.toFixed(fractionDigits) + 's'
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
    formattedDuration: computed(() => formatDuration(duration.value))
  }
}

function trim(audioBuffer: AudioBuffer, startRatio: number, endRatio: number): AudioBuffer {
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

  if (startRatio === 0 && endRatio === 1) {
    // No trimming needed
    return audioBuffer
  }

  const startTime = audioBuffer.duration * startRatio
  const endTime = audioBuffer.duration * endRatio

  const numChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const startSample = Math.floor(startTime * sampleRate)
  const endSample = Math.floor(endTime * sampleRate)
  const newLength = endSample - startSample

  const trimmedBuffer = getAudioContext().createBuffer(numChannels, newLength, sampleRate)

  for (let channel = 0; channel < numChannels; channel++) {
    const oldChannelData = audioBuffer.getChannelData(channel)
    const newChannelData = trimmedBuffer.getChannelData(channel)
    for (let i = 0; i < newLength; i++) {
      newChannelData[i] = oldChannelData[i + startSample]
    }
  }

  return trimmedBuffer
}

async function applyGain(audioBuffer: AudioBuffer, gainValue: number): Promise<AudioBuffer> {
  if (gainValue == 1) {
    return audioBuffer
  }
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  )
  const source = offlineContext.createBufferSource()
  source.buffer = audioBuffer

  const gainNode = offlineContext.createGain()
  gainNode.gain.value = gainValue

  source.connect(gainNode)
  gainNode.connect(offlineContext.destination)

  source.start()

  return await offlineContext.startRendering()
}

export async function trimAndApplyGainToWavBlob(
  audioBuffer: AudioBuffer,
  startRatio: number,
  endRatio: number,
  gainValue: number
): Promise<Blob> {
  const trimmedBuffer = trim(audioBuffer, startRatio, endRatio)
  const gainBuffer = await applyGain(trimmedBuffer, gainValue)
  const wavBuffer = audioBufferToWav(gainBuffer)
  return new Blob([wavBuffer], { type: 'audio/wav' })
}
