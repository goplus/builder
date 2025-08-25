//传入视频文件（方便复用在项目页面和录屏页面）
defineProps<{
    setRecordingURL: string,
    recording?: File // 传的话就更快显示，内存上没有、不传的话就去URL上下
}>()

// 定义要发射的事件
const emit = defineEmits<{
    'update:isRecording': [value: boolean]
    'update:showRecording': [value: boolean]
    'reRecord': []
}>()

function onclickReRecord() {
    // 调用 RecordingAPIs 在后端软删除最近一条视频记录
    // 通过emit向父组件发送事件，让父组件更新状态
    emit('update:isRecording', true)
    emit('update:showRecording', false)
    emit('reRecord') // 发送重新录制事件
}

import from './sharePlatform'



import from './qrcode'
