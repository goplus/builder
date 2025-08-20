import { posterResult } from "./poster"
import { ref, watch, onMounted, nextTick, computed } from 'vue' // 通过父组件（在本项目中是project.vue）传入参数
import { generateProjectQRCode } from './module_QRCode'
import html2canvas from 'html2canvas'
import { getCanvasElement } from "./getCanvas"

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


async function screenShotResult(params: screenShotParams): Promise<string> {
    const canvas = await getCanvasElement(params)
    const imgSrc = canvas.toDataURL('image/png')

    const posterProps = {
        ...params.info, // 展开拼接
        imgSrc: imgSrc
    }
    return posterResult(posterProps)
}

export { screenShotResult }

export type { screenShotParams }

