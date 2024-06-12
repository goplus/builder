// Copied and modified from:
// https://github.com/katspaugh/wavesurfer.js/blob/main/src/plugins/record.ts

/**
 * Record audio from the microphone with a real-time waveform preview
 */

import BasePlugin from 'wavesurfer.js/dist/base-plugin.js'
import type { BasePluginEvents } from 'wavesurfer.js/dist/plugins/base-plugin.js'
import Timer from 'wavesurfer.js/dist/timer.js'

export type RecordPluginOptions = {
  /** The MIME type to use when recording audio */
  mimeType?: MediaRecorderOptions['mimeType']
  /** The audio bitrate to use when recording audio, defaults to 128000 to avoid a VBR encoding. */
  audioBitsPerSecond?: MediaRecorderOptions['audioBitsPerSecond']
  /** Whether to render the recorded audio, true by default */
  renderRecordedAudio?: boolean
}

export type RecordPluginDeviceOptions = {
  /** The device ID of the microphone to use */
  deviceId?: string | { exact: string }
}

export type RecordPluginEvents = BasePluginEvents & {
  'record-start': []
  'record-pause': [blob: Blob]
  'record-resume': []
  'record-end': [blob: Blob]
  /** Fires continuously while recording */
  'record-progress': [duration: number]
}

type MicStream = {
  onDestroy: () => void
  onEnd: () => void
}

const DEFAULT_BITS_PER_SECOND = 128000

const MIME_TYPES = ['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/mp3']
const findSupportedMimeType = () =>
  MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType))

export class RecordPlugin extends BasePlugin<RecordPluginEvents, RecordPluginOptions> {
  private stream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private isWaveformPaused = false
  private originalOptions: { cursorWidth: number; interact: boolean } | undefined
  private timer: Timer
  private lastStartTime = 0
  private lastDuration = 0
  private duration = 0

  /** Create an instance of the Record plugin */
  constructor(options: RecordPluginOptions) {
    super({
      ...options,
      audioBitsPerSecond: options.audioBitsPerSecond ?? DEFAULT_BITS_PER_SECOND,
      renderRecordedAudio: options.renderRecordedAudio ?? true
    })

    this.timer = new Timer()

    this.subscriptions.push(
      this.timer.on('tick', () => {
        const currentTime = performance.now() - this.lastStartTime
        this.duration = this.isPaused() ? this.duration : this.lastDuration + currentTime
        this.emit('record-progress', this.duration)
      })
    )
  }

  /** Create an instance of the Record plugin */
  public static create(options?: RecordPluginOptions) {
    return new RecordPlugin(options || {})
  }

  public renderMicStream(stream: MediaStream): MicStream {
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)

    const dataArray = new Float32Array(analyser.frequencyBinCount)
    const dataWindow: number[] = []

    let animationId: number

    const drawWaveform = () => {
      if (this.isWaveformPaused) {
        animationId = requestAnimationFrame(drawWaveform)
        return
      }

      analyser.getFloatTimeDomainData(dataArray)
      dataWindow.push(...dataArray)

      if (this.wavesurfer) {
        this.originalOptions ??= {
          cursorWidth: this.wavesurfer.options.cursorWidth,
          interact: this.wavesurfer.options.interact
        }
        this.wavesurfer.options.cursorWidth = 0
        this.wavesurfer.options.interact = false
        this.wavesurfer.load('', [dataWindow], this.duration)
      }

      animationId = requestAnimationFrame(drawWaveform)
    }

    drawWaveform()

    return {
      onDestroy: () => {
        cancelAnimationFrame(animationId)
        source?.disconnect()
        audioContext?.close()
      },
      onEnd: () => {
        this.isWaveformPaused = true
        cancelAnimationFrame(animationId)
        this.stopMic()
      }
    }
  }

  /** Request access to the microphone and start monitoring incoming audio */
  public async startMic(options?: RecordPluginDeviceOptions): Promise<MediaStream> {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: options?.deviceId ? { deviceId: options.deviceId } : true
      })
    } catch (err) {
      throw new Error('Error accessing the microphone: ' + (err as Error).message)
    }

    const { onDestroy, onEnd } = this.renderMicStream(stream)
    this.subscriptions.push(this.once('destroy', onDestroy))
    this.subscriptions.push(this.once('record-end', onEnd))
    this.stream = stream

    return stream
  }

  /** Stop monitoring incoming audio */
  public stopMic() {
    if (!this.stream) return
    this.stream.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.mediaRecorder = null
  }

  /** Start recording audio from the microphone */
  public async startRecording(options?: RecordPluginDeviceOptions) {
    const stream = this.stream || (await this.startMic(options))
    const mediaRecorder =
      this.mediaRecorder ||
      new MediaRecorder(stream, {
        mimeType: this.options.mimeType || findSupportedMimeType(),
        audioBitsPerSecond: this.options.audioBitsPerSecond
      })
    this.mediaRecorder = mediaRecorder
    this.stopRecording()

    const recordedChunks: BlobPart[] = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data)
      }
    }

    const emitWithBlob = (ev: 'record-pause' | 'record-end') => {
      const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType })
      this.emit(ev, blob)
      if (this.options.renderRecordedAudio) {
        this.applyOriginalOptionsIfNeeded()
      }
    }

    mediaRecorder.onpause = () => emitWithBlob('record-pause')

    mediaRecorder.onstop = () => emitWithBlob('record-end')

    mediaRecorder.start()
    this.lastStartTime = performance.now()
    this.lastDuration = 0
    this.duration = 0
    this.isWaveformPaused = false
    this.timer.start()

    this.emit('record-start')
  }

  /** Get the duration of the recording */
  public getDuration(): number {
    return this.duration
  }

  /** Check if the audio is being recorded */
  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  public isPaused(): boolean {
    return this.mediaRecorder?.state === 'paused'
  }

  public isActive(): boolean {
    return this.mediaRecorder?.state !== 'inactive'
  }

  /** Stop the recording */
  public stopRecording() {
    if (this.isActive()) {
      this.mediaRecorder?.stop()
      this.timer.stop()
    }
  }

  /** Pause the recording */
  public pauseRecording() {
    if (this.isRecording()) {
      this.isWaveformPaused = true
      this.mediaRecorder?.requestData()
      this.mediaRecorder?.pause()
      this.timer.stop()
      this.lastDuration = this.duration
    }
  }

  /** Resume the recording */
  public resumeRecording() {
    if (this.isPaused()) {
      this.isWaveformPaused = false
      this.mediaRecorder?.resume()
      this.timer.start()
      this.lastStartTime = performance.now()
      this.emit('record-resume')
    }
  }

  /** Get a list of available audio devices
   * You can use this to get the device ID of the microphone to use with the startMic and startRecording methods
   * Will return an empty array if the browser doesn't support the MediaDevices API or if the user has not granted access to the microphone
   * You can ask for permission to the microphone by calling startMic
   */
  public static async getAvailableAudioDevices() {
    return navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => devices.filter((device) => device.kind === 'audioinput'))
  }

  /** Destroy the plugin */
  public destroy() {
    this.applyOriginalOptionsIfNeeded()
    super.destroy()
    this.stopRecording()
    this.stopMic()
  }

  private applyOriginalOptionsIfNeeded() {
    if (this.wavesurfer && this.originalOptions) {
      this.wavesurfer.options.cursorWidth = this.originalOptions.cursorWidth
      this.wavesurfer.options.interact = this.originalOptions.interact
      delete this.originalOptions
    }
  }
}
