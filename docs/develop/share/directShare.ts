import { PlatformConfig, SocialPlatformConfigs } from "./platformShare"
import { createPoster } from "./poster"
import { defineProps } from "vue"
/**
 * 定义组件的props
 */
const props = defineProps<{
    projectData: {
        url: string
    },
    poster: File
}>()
/**
 * 模拟qrcode返回的DataURL
 */
const qrcode = {
    toDataURL(url: string) {
        return `data:image/png;base64,${url}`
    }
}
// 默认选择第一个平台
const selectPlatform = SocialPlatformConfigs[0]
// 二维码地址 - 默认空字符串
let DataURL: string = ''

const poster = new File([], 'poster.png', { type: 'image/png' })


// 模拟poster返回的图片
const posterData = await createPoster({
    img: poster,   
    projectData: {
        name: 'test',
        description: 'test',
        image: 'test',
        video: 'test',
    }
})
// 模拟平台切换
async function handPlatformChange(platform: PlatformConfig) {
    if (platform.shareType.supportProject && platform.shareFunction.shareURL) {
        DataURL = qrcode.toDataURL(await platform.shareFunction.shareURL(props.projectData.url))
    }
    else if (platform.shareType.supportPoster && platform.shareFunction.shareImage) {
        DataURL = qrcode.toDataURL(await platform.shareFunction.shareImage(posterData))
    }
    else {
        DataURL = ''
    }
}
// 初始化时运行一次
handPlatformChange(selectPlatform)

