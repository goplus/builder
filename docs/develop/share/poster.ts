import { ref, onMounted, watch, nextTick, computed } from 'vue' // 通过父组件获取填充文字以及图片
import { generateProjectQRcode } from './qrcode'
import { generateJumpToQRcode } from './qrcode' // './第三方平台'
import html2canvas from 'html2canvas'
// import { UIIcon } from '@/components/ui' 考虑到后面可能无法引用XBuilder组件库

interface PosterProps {
    width?: number
    height?: number
    imgSrc?: string
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

async function posterResult(props: PosterProps): Promise<string> {
    const posterElement = document.createElement('div')
    // 在这里处理这个DOM节点 posterElement.className = 'poster-container'等等
    const canvas = await html2canvas(posterElement,{
        width: props.width || 600,
        height: props.height || 800
    })
    return canvas.toDataURL('image/png')
}

export default posterResult