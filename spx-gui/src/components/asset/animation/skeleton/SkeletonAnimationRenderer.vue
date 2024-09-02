<!-- SkeletonAnimationRenderer.vue -->
<!-- This is a WebGL renderer that renders the animation with playback control. -->
<!-- Note: listen to the `ready` event to get the renderer instance. -->
<template>
  <div>
    <canvas ref="canvasElement" width="800" height="600"></canvas>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { type Point3D, type AnimationExportData, type Point2D, type AnimationExportMesh } from '@/utils/ispxLoader'
import vs from './shader.vert?raw'
import fs from './shader.frag?raw'

const canvasElement = ref<null | HTMLCanvasElement>(null)
const props = withDefaults(
  defineProps<{
    data: AnimationExportData
    texture: string
    fps?: number
    autoplay?: boolean
    scale?: number
  }>(),
  {
    fps: 30,
    autoplay: true,
    scale: 40
  }
)

const emit = defineEmits<{
  ready: [Renderer]
}>()

const resize = () => {
  const canvas = canvasElement.value!
  const { clientWidth, clientHeight } = canvas.parentElement!
  canvas.width = clientWidth
  canvas.height = clientHeight
  renderer.resize()
  renderer.frameIndex = renderer?.frameIndex ?? 0
}

let renderer: Renderer
let resizeTimer: any
let dynamicBuffers: twgl.BufferInfo[][]
let staticBuffer: twgl.BufferInfo

onMounted(async () => {
  console.log('mounted')
  const gl = canvasElement.value!.getContext('webgl')! as CanvasWebGLRenderingContext
  console.time('TIME: getBufferInfo')
  if (!dynamicBuffers || !staticBuffer) {
    const [ _dynamicBuffers, _staticBuffer ] = getBufferInfo(gl, props.data)
    dynamicBuffers = _dynamicBuffers
    staticBuffer = _staticBuffer
  }
  console.timeEnd('TIME: getBufferInfo')

  renderer = new Renderer(gl, dynamicBuffers, staticBuffer, vs, fs, props.texture, props.fps, props.scale)
  if (props.autoplay) {
    renderer.start()
  }

  window.addEventListener('resize', resize)
  resizeTimer = setInterval(resize, 10000)
  resize()

  setTimeout(() => emit('ready', renderer), 100)
})

watch(() => props.scale, () => {
  renderer.scale = props.scale
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  clearInterval(resizeTimer)
})
</script>
<script lang="ts">
import * as twgl from 'twgl.js'
const m4 = twgl.m4

type CanvasWebGLRenderingContext = WebGLRenderingContext & {
  canvas: HTMLCanvasElement
}

interface Uniforms {
  uTexture: WebGLTexture
  uResolution: [number, number]
  uFlipY: 1 | -1
  uTranslate: [number, number]
}

/**
 * A WebGL renderer that renders the animation with playback control.
 *
 * @param gl The WebGLRenderingContext
 * @param bufferInfos The bufferInfos to render,
 * 		each bufferInfo[] represents a frame containing multiple meshes.
 * 		A bufferInfo represents a mesh containing position, uv, and indices.
 * 		Use `getBufferInfo` to get the bufferInfos from the `AnimationExportData`.
 * @param vs The vertex shader source code. It could be a code string or the id of a script tag.
 * @param fs The fragment shader source code. It could be a code string or the id of a script tag.
 * @param texSrc The texture source url.
 * @param fps The frame rate of the animation and it will affect the playback speed. Default is 30.
 * 		set the fpsLimit to limit the frame rate.
 *
 * @example
 * ```ts
 * const gl = canvasElement.getContext("webgl")! as CanvasWebGLRenderingContext;
 * const data = getBufferInfo(gl, ...);
 * const vs = `...`;
 * const fs = `...`;
 * const renderer = new Renderer(gl, bufferInfos, vs, fs, `...`);
 * renderer.start();
 * ```
 */
export class Renderer {
  private gl: CanvasWebGLRenderingContext
  private programInfo: twgl.ProgramInfo
  private dynamicBuffers: twgl.BufferInfo[][]
  private staticBuffer: twgl.BufferInfo
  private uniforms: Partial<Uniforms>

  constructor(
    gl: CanvasWebGLRenderingContext,
    dynamicBuffers: twgl.BufferInfo[][],
    staticBuffer: twgl.BufferInfo,
    vs: string,
    fs: string,
    texSrc: string,
    fps: number = 30,
    scale: number = 40
  ) {
    this.gl = gl
    this.programInfo = setupProgram(gl, vs, fs)
    this.dynamicBuffers = dynamicBuffers
    this.staticBuffer = staticBuffer
    this.uniforms = setupUniforms(gl, this.programInfo, texSrc, scale)
    this.fps = fps
    this.scale = scale
  }

  // playback control
  /**
   * The maximum frame rate limit.
   * It does not affect the playback speed,
   * if the frame rate is higher than the limit,
   * the renderer will skip frames to match the limit.
   */
  fpsLimit = 30
  private get limitedDuration() {
    return 1000 / this.fpsLimit
  }

  /**
   * The frame rate of the animation.
   * It affects the playback speed.
   */
  fps: number
  private get frameDuration() {
    return 1000 / this.fps
  }
  private startTimeStamp = 0
  private previousTimeStamp = 0
  private previousFrameIndex = 0
  private _frameIndex = 0

  get frameIndex() {
    return this._frameIndex
  }
  set frameIndex(index: number) {
    const savedPlaying = this._playing
    this.stop()
    this._frameIndex = index
    this.renderFrame()
    if (savedPlaying) {
      this.start()
    }
  }
  get totalFrames() {
    return this.dynamicBuffers.length
  }
  private _currentFps = 0
  get currentFps() {
    return this._currentFps
  }
  private _playing = false
  get playing() {
    return this._playing
  }

  private renderFrame() {
    initScene(this.gl)
    const bufferInfos = this.dynamicBuffers[this.frameIndex]
    for (let i = 0; i < bufferInfos.length; i++) {
      drawElement(this.gl, this.programInfo, bufferInfos[i], this.staticBuffer)
    }
  }

  private render(time: number) {
    if (!this.startTimeStamp) this.startTimeStamp = time

    // limit the frame rate to the fpsLimit
    if (this.limitedDuration > time - this.previousTimeStamp) {
      requestAnimationFrame(this.render.bind(this))
      return
    }

    // calc frame index based on time
    const elapsed = time - this.startTimeStamp
    this._frameIndex = Math.floor(elapsed / this.frameDuration) % this.dynamicBuffers.length

    this._currentFps = Math.round(1000 / (time - this.previousTimeStamp))
    if (this.frameIndex !== this.previousFrameIndex) {
      this.previousFrameIndex = this.frameIndex
      this.renderFrame()
    }

    this.previousTimeStamp = time
    if (this.playing) {
      requestAnimationFrame(this.render.bind(this))
    }
  }

  start() {
    this._playing = true
    requestAnimationFrame(this.render.bind(this))
  }

  reset() {
    this._frameIndex = 0
    this.startTimeStamp = 0
    this.previousTimeStamp = 0
  }

  stop() {
    this._playing = false
  }

  getFrameImgAt(index: number) {
    const savedIndex = this._frameIndex
    const savedPlaying = this._playing
    this.stop()
    this._frameIndex = index
    this.renderFrame()
    const img = this.gl.canvas.toDataURL()

    this._frameIndex = savedIndex
    if (savedPlaying) {
      this.start()
    }
    return img
  }

  private _scale: number = 40
  get scale() {
    return this._scale
  }
  set scale(scale: number) {
    this._scale = scale
    this.resize()
  }
  resize() {
    const newUniforms = {} as Partial<Uniforms>
    setupResolutionMap(this.gl, newUniforms, this.scale)
    updateUniforms(this.programInfo, this.uniforms, newUniforms)
  }
}

/**
 * Converts the AnimationExportData to bufferInfos.
 *
 * @param gl The WebGLRenderingContext
 * @param data The AnimationExportData to convert
 */
export function getBufferInfo(gl: CanvasWebGLRenderingContext, data: AnimationExportData) {
  function getBufferInfoFromMesh(gl: CanvasWebGLRenderingContext, mesh: AnimationExportMesh) {
    const positions = (() => {
      if (!mesh.Vertices) return null
      return {
        data: new Float32Array(mesh.Vertices.data.buffer),
        numComponents: 3,
        drawType: gl.DYNAMIC_DRAW,
      }
    })()
    
    const aUV = (() => {
      if (!mesh.Uvs) return null
      return {
        data: new Float32Array(mesh.Uvs.data.buffer),
        numComponents: 2,
        drawType: gl.STATIC_DRAW,
      }
    })()

    const arrays = {
      position: positions ?? undefined,
      aUV: aUV ?? undefined,
      indices: { data: mesh.Indices, drawType: gl.STATIC_DRAW }
    } as twgl.Arrays

    if (!positions) delete arrays.position
    if (!aUV) delete arrays.aUV

    return twgl.createBufferInfoFromArrays(gl, arrays)
  }

  const dynamicBuffers = data.Frames.map((frame) => {
    return frame.Meshes.map((mesh) => {
      return getBufferInfoFromMesh(gl, mesh)
    })
  })

  const staticBuffer = getBufferInfoFromMesh(gl, data.Frames[0].Meshes[0])
  return [dynamicBuffers, staticBuffer] as const
}

/**
 * Sets up the shader program.
 *
 * @param gl The WebGLRenderingContext
 * @param vs The vertex shader source code. It could be a code string or the id of a script tag.
 * @param fs The fragment shader source code. It could be a code string or the id of a script tag.
 */
export function setupProgram(gl: CanvasWebGLRenderingContext, vs: string, fs: string) {
  const programInfo = twgl.createProgramInfo(gl, [vs, fs])

  gl.useProgram(programInfo.program)
  return programInfo
}

/**
 * Initializes the scene.
 *
 * @param gl The WebGLRenderingContext
 * @param cull Whether to cull the front or back face.
 *  	Note: culling the back face may cause the object to disappear with the default camera settings.
 */
export function initScene(gl: CanvasWebGLRenderingContext, cull: false | 'front' | 'back' = false) {
  // twgl.resizeCanvasToDisplaySize(gl.canvas)
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  if (cull) {
    gl.enable(gl.CULL_FACE)
    gl.cullFace(cull === 'front' ? gl.FRONT : gl.BACK)
  }

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
}

/**
 * Sets up the resolution.
 * 
 * It will map the canvas coordinate (0, 0) ~ (canvas.width, canvas.height) to 
 * WebGL clip space coordinate (-1, -1) ~ (1, 1).
 *
 * @param gl The WebGLRenderingContext
 * @param uniforms The uniforms to set the projection and view matrix
 * @param scale
 */
export function setupResolutionMap(gl: CanvasWebGLRenderingContext, uniforms: Partial<Uniforms>, scale: number = 40) {
  uniforms.uResolution = [gl.canvas.width / scale, gl.canvas.height / scale]
  uniforms.uTranslate = [1, 1]
  uniforms.uFlipY = 1
}

/**
 * Sets up the texture.
 *
 * @param gl The WebGLRenderingContext
 * @param uniforms The uniforms to set the texture
 * @param texSrc The texture img source url
 */
export function setupTexture(
  gl: CanvasWebGLRenderingContext,
  uniforms: Partial<Uniforms>,
  texSrc: string
) {
  const tex = twgl.createTexture(gl, {
    src: texSrc
  })
  uniforms.uTexture = tex
}

/**
 * Sets up the uniforms.
 *
 * @param gl The WebGLRenderingContext
 * @param programInfo The programInfo to set the uniforms
 * @param texSrc The texture img source url
 */
export function setupUniforms(
  gl: CanvasWebGLRenderingContext,
  programInfo: twgl.ProgramInfo,
  texSrc: string,
  scale: number = 40
) {
  const uniforms = {} as Partial<Uniforms>
  setupTexture(gl, uniforms, texSrc)
  setupResolutionMap(gl, uniforms, scale)

  twgl.setUniforms(programInfo, uniforms)
  return uniforms as Uniforms
}

/**
 * Updates the uniforms.
 */
export function updateUniforms(
  programInfo: twgl.ProgramInfo,
  uniforms: Partial<Uniforms>,
  newUniforms: Partial<Uniforms>
) {
  Object.assign(uniforms, newUniforms)
  twgl.setUniforms(programInfo, uniforms)
}

/**
 * Draws a element.
 */
export function drawElement(
  gl: CanvasWebGLRenderingContext,
  programInfo: twgl.ProgramInfo,
  dynamicBuffer: twgl.BufferInfo,
  staticBuffer?: twgl.BufferInfo
) {
  // twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo)
  // gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0)
  if (staticBuffer) {
    twgl.setBuffersAndAttributes(gl, programInfo, staticBuffer)
  }
  twgl.setBuffersAndAttributes(gl, programInfo, dynamicBuffer)
  gl.drawElements(gl.TRIANGLES, dynamicBuffer.numElements, gl.UNSIGNED_SHORT, 0)

}
</script>
<style scoped></style>
