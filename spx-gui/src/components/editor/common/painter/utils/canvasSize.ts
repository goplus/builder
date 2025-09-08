export function getCanvasSize(canvasRef: HTMLCanvasElement) {
    const rect = canvasRef.getBoundingClientRect()
    console.log(rect.width,rect.height,'rect')
    return {
        width: rect.width,
        height: rect.height
    }
}


