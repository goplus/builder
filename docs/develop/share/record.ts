import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { getCanvasElement } from './getCanvas'

interface RecordProps {
    canvasElement?: HTMLCanvasElement
    canvasSelector?: string

    width?: number
    height?: number
    fps?: number
}

interface RecordState {
    isRecording: boolean
    hasRecorded: boolean
}

const State: RecordState = {
    isRecording: false,
    hasRecorded: false
}

let mediaRecorder: MediaRecorder | null = null // 控制器
let recordedChunks: Blob[] = [] // 录制过程中的二进制数据块
let stream: MediaStream | null = null // canvas拼接而来: stream = canvas.captureStream(RecordPros.fps || 30)

async function startRecording(options: RecordProps = {}): Promise<void> {
    const canvas = getCanvasElement(options)
    /* 在这里更新状态等等
    if (State.isRecording){
    */
}

function stopRecording(): void {
    // 同理，在这里更新状态
}

function handleRecordingComplete(): Blob {
    const videoBlob = new Blob(recordedChunks,{ type: 'video/mp4'})
    // stop后的回调函数
    // 还是返回文件更有适用性而不是下载 outputRecording(videoBlob)
    return videoBlob
}

function outputRecording(videoBlob: Blob): void{
    const url = URL.createObjectURL(videoBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `screen-recording-${Date.now()}.webm`
    a.style.display = 'none'
    // 在这里监听下载和后面的清理
}

async function toggleRecording(canvas: HTMLCanvasElement, options: RecordProps = {}): Promise<void> {
    // 切换状态
}

function resetRecording(): void {
    // 重置变量状态
    // 清理媒体流
}

function getRecordState(): RecordState {
    return State
}

export {
    startRecording,
    stopRecording,
    handleRecordingComplete,
    toggleRecording,
    resetRecording,
    getRecordState // 变量私有性，只暴露访问方法
}

export type { RecordProps, RecordState }