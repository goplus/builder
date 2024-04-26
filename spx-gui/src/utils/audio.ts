/*
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-03-06 19:52:28
 * @LastEditors: Yao xinyue
 * @LastEditTime: 2024-03-06 19:52:28
 * @FilePath: src/util/audio.ts
 * @Description: Audio Utils
 */

import { computed, ref, watchEffect } from 'vue'

/**
 * Converts an array of audio chunks into an AudioBuffer.
 *
 * @param {Blob[]} audioChunks - An array of audio chunks, typically collected during media recording.
 * @param {string} mimeType - The MIME type of the audio, based on your MediaRecorder settings.
 * @returns {Promise<AudioBuffer>} A promise that resolves to an AudioBuffer constructed from the input audio chunks.
 */
export const convertAudioChunksToAudioBuffer = async (
  audioChunks: Blob[],
  mimeType: string
): Promise<AudioBuffer> => {
  const audioBlob: Blob = new Blob(audioChunks, { type: mimeType })
  const arrayBuffer: ArrayBuffer = await blobToArrayBuffer(audioBlob)
  return await decodeAudioData(arrayBuffer)
}

/**
 * Converts an AudioBuffer into a WAV Blob.
 *
 * @param {AudioBuffer} audioBuffer - The AudioBuffer to be converted.
 * @returns {Blob} A Blob in WAV format representing the input AudioBuffer.
 */
export const audioBufferToWavBlob = (audioBuffer: AudioBuffer): Blob => {
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
  return new Blob([view], { type: 'audio/wav' })
}

/**
 * Converts a Blob to an ArrayBuffer.
 *
 * @param {Blob} blob - The Blob to be converted.
 * @returns {Promise<ArrayBuffer>} A promise that resolves to an ArrayBuffer representing the Blob's data.
 */
const blobToArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader: FileReader = new FileReader()
    reader.onloadend = () => {
      resolve(reader.result as ArrayBuffer)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(blob)
  })
}

/**
 * Decodes an ArrayBuffer into an AudioBuffer using the AudioContext.
 *
 * @param {ArrayBuffer} arrayBuffer - The ArrayBuffer to be decoded.
 * @returns {Promise<AudioBuffer>} A promise that resolves to an AudioBuffer representing the decoded audio data.
 */
const decodeAudioData = (arrayBuffer: ArrayBuffer): Promise<AudioBuffer> => {
  const audioContext: AudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)()
  return audioContext.decodeAudioData(arrayBuffer)
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
