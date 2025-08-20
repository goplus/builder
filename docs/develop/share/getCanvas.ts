interface canvasParams {
    canvasElement?: HTMLCanvasElement
    canvasSelector?: string
    iframeSelector?: string
}

async function getCanvasElement(params: canvasParams): Promise<HTMLCanvasElement>{
    if (params.canvasElement) {
        return params.canvasElement
    }
    
    // 低优先级：选择器
    const selector = params.canvasSelector || 'game-canvas' // 在本项目中默认为game画布内容，设置默认值防止undefined报错
    
    // 如果指定了 iframe 选择器，则在 iframe 中查找
    if (params.iframeSelector) {
        const iframe = document.querySelector(params.iframeSelector) as HTMLIFrameElement
        if (iframe && iframe.contentDocument) {
            const canvas = iframe.contentDocument.querySelector(selector) as HTMLCanvasElement
            if (canvas) {
                return canvas
            }
        }
    }
    
    // 在当前文档中查找
    const canvas = document.querySelector(selector) as HTMLCanvasElement
    // if (!canvas) throw
    return canvas
}

export { getCanvasElement }