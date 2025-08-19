import { ref, onMounted, watch, nextTick, computed } from 'vue' // 通过父组件获取填充文字以及图片
import { generateProjectQRcode } from './qrcode'
import html2canvas from 'html2canvas'
// import { UIIcon } from '@/components/ui' 考虑到后面可能无法引用XBuilder组件库
// 海报中不需要跳转到第三方平台 import { generateJumpToQRcode } from './qrcode' // './第三方平台'

interface posterProps {
    width?: number
    height?: number
    imgSrc?: string // 本来想通过直接嵌入screenShot的canvas，但是为了兼容性还是选择图片
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

async function posterResult(props: posterProps): Promise<string> {
    const posterElement = document.createElement('div')
    // 在这里处理这个DOM节点 posterElement.className = 'poster-container'、填入props信息、二维码等等
    const canvas = await html2canvas(posterElement,{
        width: props.width || 600,
        height: props.height || 800
    })
    return canvas.toDataURL('image/png')
}

export default posterResult