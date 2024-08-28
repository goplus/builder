<!-- SkeletonAnimationRenderer.vue -->
<!-- This is a WebGL renderer that renders the animation with playback control. -->
<!-- Note: listen to the `ready` event to get the renderer instance. -->
<template>
  <div>
    <canvas ref="canvasElement" width="800" height="600"></canvas>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { type AnimationExportData } from '@/utils/ispxLoader'
import vs from './shader.vert?raw'
import fs from './shader.frag?raw'

const canvasElement = ref<null | HTMLCanvasElement>(null)
const props = withDefaults(
  defineProps<{
    data: AnimationExportData
    texture: string
    fps?: number
    autoplay?: boolean
  }>(),
  {
    fps: 30,
    autoplay: true
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
  // content will be resized automatically when next frame is rendered
}

let renderer: Renderer
let resizeTimer: any

onMounted(async () => {
  const gl = canvasElement.value!.getContext('webgl')! as CanvasWebGLRenderingContext
  const bufferInfos = getBufferInfo(gl, props.data)

  renderer = new Renderer(gl, bufferInfos, vs, fs, props.texture, props.fps)
  if (props.autoplay) {
    renderer.start()
  }

  window.addEventListener('resize', resize)
  resizeTimer = setInterval(resize, 10000)
  resize()

  setTimeout(() => emit('ready', renderer), 100)
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
  uProjectionMatrix: twgl.m4.Mat4
  uWorldTransformMatrix: twgl.m4.Mat4
  uTransformMatrix: twgl.m4.Mat4
  uTexture: WebGLTexture
}

/**
 * A WebGL renderer that renders the animation with playback control.
 *
 * @param gl The WebGLRenderingContext
 * @param bufferInfos The bufferInfos to render,
 * 		each bufferInfo[] represents a frame containing multiple meshes.
 * 		A bufferInfo represents a mesh containing position, uv, and indices.
 * 		Use `getBufferInfo` to get the bufferInfos from the `AnimExportData`.
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
  private bufferInfos: twgl.BufferInfo[][] = []
  private uniforms: Partial<Uniforms>

  constructor(
    gl: CanvasWebGLRenderingContext,
    bufferInfos: twgl.BufferInfo[][],
    vs: string,
    fs: string,
    texSrc: string,
    fps: number = 30
  ) {
    this.gl = gl
    this.programInfo = setupProgram(gl, vs, fs)
    this.bufferInfos = bufferInfos
    this.uniforms = setupUniforms(gl, this.programInfo, texSrc)
    this.fps = fps
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
    return this.bufferInfos.length
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
    const bufferInfos = this.bufferInfos[this.frameIndex]
    for (let i = 0; i < bufferInfos.length; i++) {
      drawElement(this.gl, this.programInfo, bufferInfos[i])
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
    this._frameIndex = Math.floor(elapsed / this.frameDuration) % this.bufferInfos.length

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
}

/**
 * Converts the AnimExportData to bufferInfos.
 *
 * @param gl The WebGLRenderingContext
 * @param data The AnimExportData to convert
 */
export function getBufferInfo(gl: CanvasWebGLRenderingContext, data: AnimationExportData) {
  return data.Frames.map((frame) => {
    return frame.Meshes.map((mesh) => {
      const arrays = {
        position: {
          data: mesh.Vertices.map(({ x, y, z }) => [x, y, z]).flat(),
          drawType: gl.DYNAMIC_DRAW,
        },
        aUV: { data: mesh.Uvs.map(({ x, y }) => [x, y, 0]).flat(), drawType: gl.STATIC_DRAW },
        indices: { data: mesh.Indices, drawType: gl.STATIC_DRAW }
      } satisfies twgl.Arrays
      return twgl.createBufferInfoFromArrays(gl, arrays)
    })
  })
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
  twgl.resizeCanvasToDisplaySize(gl.canvas)
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  if (cull) {
    gl.enable(gl.CULL_FACE)
    gl.cullFace(cull === 'front' ? gl.FRONT : gl.BACK)
  }

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
}

/**
 * Sets up the camera.
 *
 * set the projection matrix and the view matrix in the uniforms.
 * The uniforms should be passed to the shader program later.
 *
 * Note: the camera is flipped on the y-axis
 *  by standing at the negative z-axis, looking at the positive z-axis
 *  and heading towards the negative y-axis.
 * So we are looking at the back face of the elements.
 *
 * @param gl The WebGLRenderingContext
 * @param uniforms The uniforms to set the projection and view matrix
 */
export function setupCamera(gl: CanvasWebGLRenderingContext, uniforms: Partial<Uniforms>) {
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
  const zNear = 0
  const zFar = 2000
  const viewSize = 10
  const projection = m4.ortho(
    -viewSize * aspect,
    viewSize * aspect,
    viewSize,
    -viewSize,
    zNear,
    zFar
  )
  const eye = [0, 0, -(zFar - zNear) / 2]
  const target = [0, 0, 0]
  const up = [0, -1, 0]

  const camera = m4.lookAt(eye, target, up)
  const view = m4.inverse(camera)
  uniforms.uProjectionMatrix = projection
  uniforms.uWorldTransformMatrix = view
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
  texSrc: string
) {
  const uniforms = {} as Partial<Uniforms>
  setupTexture(gl, uniforms, texSrc)
  setupCamera(gl, uniforms)
  uniforms.uTransformMatrix = m4.identity()

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
  bufferInfo: twgl.BufferInfo
) {
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo)
  gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_SHORT, 0)
}
</script>
<style scoped></style>
