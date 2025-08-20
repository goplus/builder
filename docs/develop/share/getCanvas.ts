interface canvasParams {
    canvasElement?: HTMLCanvasElement
    canvasSelector?: string
}

async function getCanvasElement(params: canvasParams): Promise<HTMLCanvasElement>{
    // 高优先级：如果有直接传入直接 return
    // 低优先级：选择器
    const selector = params.canvasSelector || 'game-canvas' // 在本项目中默认为game画布内容，设置默认值防止undefined报错
    const canvas = document.querySelector(selector) as HTMLCanvasElement
    // if (!canvas) throw
    return canvas
}

export { getCanvasElement }