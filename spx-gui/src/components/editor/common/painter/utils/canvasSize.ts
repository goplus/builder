export function getCanvasSize(canvasRef: HTMLCanvasElement) {
  // 使用父容器的尺寸而不是 canvas 本身的尺寸，避免溢出
  const parent = canvasRef.parentElement
  if (parent) {
    const rect = parent.getBoundingClientRect()
    // 确保尺寸至少为 1，避免零尺寸
    return {
      width: Math.max(rect.width, 1),
      height: Math.max(rect.height, 1)
    }
  }
  // 回退到 canvas 自身尺寸
  const rect = canvasRef.getBoundingClientRect()
  return {
    width: Math.max(rect.width, 1),
    height: Math.max(rect.height, 1)
  }
}
