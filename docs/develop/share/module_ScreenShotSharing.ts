import { ref, watch, defineProps } from 'vue'
import { createPoster } from './module_poster'
import type { ProjectData } from '@/apis/project'

//传入截屏海报图片文件
const props = defineProps<{
    ScreenShot: File | null
    projectData: ProjectData
}>()

const poster = createPoster({ img: props.ScreenShot, projectData: props.projectData })

//从 platfromSelect 得到当前点击的平台名称
//从 platfromShare 拿到输出跳转 URL 的方法

// 导入必要的类型和函数
import type { PlatformShare } from './platformShare'
import { sharePoster } from './platformShare'

// 导入qrcode第三方库
import QRCode from 'qrcode'

// 导入平台选择器组件
import platformSelector from './platformSelector.vue'

// 存储生成的二维码数据URL
const qrCodeDataURL = ref<string>('')

// 处理平台选择变化
async function handlePlatformChange(platform: PlatformShare) {
    // 从子组件获取当前点击的平台
    console.log('当前选择的平台:', platform)
    
    try {
        // 可以根据平台类型执行不同的逻辑
        if (platform.shareType.supportPoster) {
            // 支持海报分享的平台
            console.log('该平台支持海报分享')
            
            // 调用platformShare中的sharePoster函数
            const shareResult = await sharePoster(platform, props.poster, 'project-url-here')
            console.log('海报分享结果:', shareResult)
            
            // 将分享结果URL转为二维码
            await generateQRCode(shareResult)
        }
        
        // 如果支持项目直接分享
        if (platform.shareType.supportProject) {
            // 调用platformShare中的directShare函数
            const shareResult = await directShare(platform, 'project-url-here')
            console.log('直接分享结果:', shareResult)
            
            // 将分享结果URL转为二维码
            await generateQRCode(shareResult)
        }
    } catch (error) {
        console.error('分享处理失败:', error)
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
        console.log('二维码生成成功:', qrDataURL)
        
        // 可以在这里触发其他操作，比如显示二维码
        emit('qrCodeGenerated', qrDataURL)
        
    } catch (error) {
        console.error('二维码生成失败:', error)
    }
}