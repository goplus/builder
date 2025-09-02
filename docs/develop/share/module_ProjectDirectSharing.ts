/**
 * 直接分享组件
*/
// 导入必要的类型和函数
import { PlatformConfig } from "./platformShare"
import Poster from "./poster"
import { defineProps, ref } from "vue"
/**
 * 定义组件的props
 */
const props = defineProps<{
    projectData: {
        // 项目数据
        // 项目URL
        url: string
        // 项目缩略图
        thumbnail: string
    },
    platform: PlatformConfig
}>()

// 以下是伪代码
/**
 * 模拟qrcode返回的DataURL
 */
const qrcode = {
    toDataURL(url: string) {
        return `data:image/png;base64,${url}`
    }
}
// 默认选择第一个平台
const selectPlatform = props.platform
// 二维码地址 - 默认空字符串
let DataURL: string = ''


// 模拟poster返回的图片
const posterCompRef = ref<InstanceType<Poster>>()
const posterData = await posterCompRef.value.createPoster({ img: props.screenShot, ProjectData: props.projectData})

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

