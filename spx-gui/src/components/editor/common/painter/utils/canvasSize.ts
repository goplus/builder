export function getCanvasSize(canvasRef: HTMLCanvasElement) {
  const rect = canvasRef.getBoundingClientRect()
  return {
    width: rect.width,
    height: rect.height
  }
}
