/**
 * @file canvas utils
 * @desc Utility functions for working with HTML canvas elements.
 */

/**
 * Get rendering context for image drawing on a canvas.
 * Some settings are applied to the context to optimize for builder use cases.
 */
export function getImgDrawingCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D
export function getImgDrawingCtx(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D
export function getImgDrawingCtx(canvas: HTMLCanvasElement | OffscreenCanvas) {
  const ctx = canvas.getContext('2d')
  if (ctx == null) throw new Error('Failed to get canvas context')
  // Disable image smoothing to keep pixelated look, so it looks good for pixel art assets
  // See details in https://github.com/goplus/builder/issues/2214
  ctx.imageSmoothingEnabled = false
  return ctx
}
