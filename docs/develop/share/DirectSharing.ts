import { SocialPlatform } from "./sharePlatform"
import { getPlatformByName } from "./sharePlatform"
import { createPoster } from "./poster"
/**
 * 模拟qrcode返回的DataURL
 */
const qrcode = {
    toDataURL(url: string) {
        return `data:image/png;base64,${url}`
    }
}

const selectPlatform = 'qq'

const url = getPlatformByName(selectPlatform)?.url

const defaultDataURL = "https://www.qiniu.com"
// 模拟qrcode返回的DataURL
const DataURL = qrcode.toDataURL(url || defaultDataURL)
// 模拟poster返回的图片
const poster = await createPoster({
    //相应参数
})
// 模拟平台切换
const handPlatformChange = async (platformName: string) => {
    const selectPlatform = getPlatformByName(platformName)
    const url = selectPlatform?.url
    const DataURL = qrcode.toDataURL(url || defaultDataURL)
}
// 初始化时运行一次
handPlatformChange(selectPlatform)

