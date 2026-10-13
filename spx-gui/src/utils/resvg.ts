import init, { Renderer, RenderOptions } from '@/assets/wasm/resvg.js'
import type { File } from '@/models/common/file'

export type SvgRenderOptions = {
  /** Maximum width or height of the rendered image, in pixels. */
  maxSize: number
}

export type SvgRenderer = {
  render(svg: string, options: SvgRenderOptions): Uint8Array
}

let initialization: ReturnType<typeof init> | null = null

/** Creates a renderer that maps project font family names to their exact font faces. */
export async function createSvgRenderer(fonts: Map<string, File>): Promise<SvgRenderer> {
  if (initialization == null) initialization = init()
  await initialization
  const entries = Array.from(fonts)
  const fontNames = entries.map(([name]) => name)
  const fontBuffers = await Promise.all(entries.map(([, file]) => file.arrayBuffer()))
  const renderer = new Renderer(fontNames, fontBuffers)
  return {
    render(svg, options) {
      return renderer.render(svg, new RenderOptions(options.maxSize))
    }
  }
}
