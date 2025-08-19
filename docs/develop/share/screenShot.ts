import posterResult from "./poster"
import { ref, watch, onMounted, nextTick, computed } from 'vue' // 通过父组件（在本项目中是project.vue）传入参数
import { generateProjectQRcode } from './qrcode'
import html2canvas from 'html2canvas'

interface screenShotParams {
    canvasElement?: HTMLCanvasElement // 直接传入 canavs 元素
    canvasSelector?: string // 在本项目中为'game-canvas'
    
    info:{
        width?: number
        height?: number
        title?: string
        owner?: string
        description?: string
        stats?: {
            viewCnt?: number
            likeCnt?: number
            starCnt?: number
            remixCnt?: number
        }
        jumpToUrl?: string
    }
}

async function getCanvasElement(params: screenShotParams): Promise<HTMLCanvasElement>{
    // 高优先级：如果有直接传入直接 return
    // 低优先级：选择器
    const selector = params.canvasSelector || 'game-canvas' // 在本项目中默认为game画布内容，设置默认值防止undefined报错
    const canvas = document.querySelector(selector) as HTMLCanvasElement
    // if (!canvas) throw
    return canvas
}

async function screenShotResult(params: screenShotParams): Promise<string> {
    const canvas = await getCanvasElement(params)
    const imgSrc = canvas.toDataURL('image/png')

    const posterProps = {
        ...params.info, // 展开拼接
        imgSrc: imgSrc
    }
    return posterResult(posterProps)
}

export default screenShotResult