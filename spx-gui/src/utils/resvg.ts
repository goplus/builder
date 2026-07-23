import init, { Renderer } from '@/assets/wasm/resvg.js'
import type { File } from '@/models/common/file'

export type SvgRenderer = {
  render(svg: string): Uint8Array
}

let initialization: Promise<void> | null = null

function initialize() {
  if (initialization == null) initialization = init().then(() => undefined)
  return initialization
}

/** Creates a renderer that maps project font family names to their exact font faces. */
export async function createSvgRenderer(fonts: Map<string, File>): Promise<SvgRenderer> {
  await initialize()
  const entries = Array.from(fonts)
  const fontNames = entries.map(([name]) => name)
  const fontBuffers = await Promise.all(entries.map(([, file]) => file.arrayBuffer()))
  return new Renderer(fontNames, fontBuffers)
}
