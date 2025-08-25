import { ref, computed, defineProps } from 'vue'

//传入视频文件（方便复用在项目页面和录屏页面）
const props = defineProps<{
    Recording: RecordData,
    video?: File // 传的话就更快显示，内存上没有、不传的话就去URL上下后再显示
}>()

const recordPageUrl = computed(() => {
    return props.Recording ? `/record/$(props.Recording.id)` : ''
})

// 导入必要的类型和函数
import type { PlatformShare } from './platformShare'
import { directShare } from './platformShare'

// 导入qrcode第三方库
import QRCode from 'qrcode'

/*
// 定义要发射的事件
const emit = defineEmits<{
    'update:isRecording': [value: boolean]
    'update:showRecording': [value: boolean]
    'reRecord': []
    'platformSelected': [platform: PlatformShare]
    'qrCodeGenerated': [qrCodeDataURL: string]
}>()
*/
// 将逻辑处理统一移到父组件
const props = defineProps<{
    remixSource?: string
    visible: boolean
}>()
  
const emit = defineEmits<{
    cancelled: []
    resolved: [name: string]
}>()



// 导入平台选择器组件
import platformSelector from './platformSelector.vue'
import { RecordData } from './module_RecordingApis'

// 存储生成的二维码数据URL
const qrCodeDataURL = ref<string>('')

function onclickReRecord() {
    // 调用 RecordingAPIs 在后端软删除最近一条视频记录
    // 通过emit向父组件发送事件，让父组件更新状态
    emit('update:isRecording', true)
    emit('update:showRecording', false)
    emit('reRecord') // 发送重新录制事件
}

// 处理平台选择变化
async function handlePlatformChange(platform: PlatformShare) {
    // 从子组件获取当前点击的平台
    console.log('当前选择的录屏分享平台:', platform)
    
    try {
        // 判断平台类型，决定调用哪种分享方法
        // 通过检查是否支持视频分享来判断是否为视频平台
        const isVideoPlatform = platform.shareType.supportVideo && platform.shareFunction.shareVideo
        
        if (isVideoPlatform) {
            // TikTok、Bilibili、RedBook 等视频平台调用 shareVideo 方法
            console.log('该平台支持视频分享，调用shareVideo方法')
            
            // 确保有录制的视频文件
            if (props.recording) {
                const shareResult = await platform.shareFunction.shareVideo!(props.recording)
                console.log('视频分享结果:', shareResult)
                
                // 将分享结果URL转为二维码
                await generateQRCode(shareResult)
            } else {
                console.error('没有可用的录制视频文件')
            }
        } else {
            // 其他平台调用 shareURL 方法
            if (platform.shareType.supportProject && platform.shareFunction.shareURL) {
                console.log('该平台支持链接分享，调用shareURL方法')
                
                // 调用platformShare中的directShare函数，传入录屏页面URL
                const shareResult = await directShare(platform, props.setRecordingURL)
                console.log('录屏分享结果:', shareResult)
                
                // 将分享结果URL转为二维码
                await generateQRCode(shareResult)
            } else {
                console.log('该平台不支持录屏分享')
            }
        }
    } catch (error) {
        console.error('录屏分享处理失败:', error)
    }
}

// 将跳转URL转为二维码
async function generateQRCode(url: string) {
    try {
        // 使用qrcode库生成二维码的DataURL
        const qrDataURL = await QRCode.toDataURL(url, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        })
        
        qrCodeDataURL.value = qrDataURL
        console.log('录屏分享二维码生成成功:', qrDataURL)
        
        // 可以在这里触发其他操作，比如显示二维码
        emit('qrCodeGenerated', qrDataURL)
        
    } catch (error) {
        console.error('录屏分享二维码生成失败:', error)
    }
}