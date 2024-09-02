/**
 * Load @/assets/ispx/main.wasm for function calls
 *
 * This wasm would automatically add a canvas to the document body but we don't need it.
 */
import rawRunnerHtml from '@/assets/ispx/runner.html?raw'
import wasmExecUrl from '@/assets/wasm_exec.js?url'
import wasmUrl from '@/assets/ispx/main.wasm?url'

interface IframeWindow extends Window {
  goEditorParseSpriteAnimator: (resource: Uint8Array | ArrayBuffer, sprite: string) => string
  goEditorParseSpriteAnimation: (
    resource: Uint8Array | ArrayBuffer,
    sprite: string,
    animName: string
  ) => AnimationExportData
}

const WASM_EXEC_JS = '/wasm_exec.js'
const MAIN_WASM = 'main.wasm'

/**
 * Initialize the ispx wasm module
 *
 * This function will create an invisible iframe and load the wasm module in it
 * (to prevent the wasm from adding a canvas to the document body).
 *
 * @returns The iframe window object. WASM functions can be called from this object.
 */
function initIspxWasm(): Promise<IframeWindow> {
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'

  const runnerHTML = rawRunnerHtml.replace(WASM_EXEC_JS, wasmExecUrl).replace(MAIN_WASM, wasmUrl)
  document.head.appendChild(iframe)

  return new Promise<IframeWindow>((resolve, reject) => {
    iframe.addEventListener('load', () => {
      iframe.contentWindow!.document!.write(runnerHTML)

      iframe.contentWindow!.addEventListener('wasmReady', () => {
        resolve(iframe.contentWindow as IframeWindow)
      })

      iframe.contentWindow!.addEventListener('error', (event) => {
        reject(new Error(`Failed to initialize WASM: ${event.message}`))
      })
    })
  })
}


let ispxWasmInitPromise: Promise<IframeWindow> | undefined

/**
 * Call a function from the ispx wasm module.
 * It will wait for the wasm module to be initialized before calling the function
 *
 * @param funcName The name of the function to call
 * @param args Arguments to pass to the function
 * @returns The return value of the function
 */
async function callGoWasmFunc(funcName: keyof IframeWindow, ...args: any[]) {
  try {
    if (!ispxWasmInitPromise) {
      ispxWasmInitPromise = initIspxWasm()
    }
    const iframe = await ispxWasmInitPromise
    const result = iframe[funcName](...args)
    return result
  } catch (error) {
    console.error(`Error calling ${funcName}:`, error)
    throw error
  }
}

export interface AnimatorExportData {
  ClipsNames: string[]
  AvatarImage: string
}

export interface AnimationExportData {
  Frames: AnimationExportFrame[]
}

export interface AnimationExportFrame {
	RederOrder: number[]
  Meshes: AnimationExportMesh[]
}

export interface AnimationExportMesh {
  Indices: number[]
  Uvs?: FlatBuffer<2>
  Vertices?: FlatBuffer<3>
}
export interface FlatBuffer<N extends number = 2 | 3> {
  numComponents: N
  data: Uint8Array
}

export interface Point2D {
  x: number
  y: number
}

export interface Point3D extends Point2D {
  z: number
}

/**
 * Get animator data from a sprite file.
 * 
 * This function calls the Editor_ParseSpriteAnimator function from the ispx wasm module.
 * Currently, it returns the clips names and the avatar image.
 * 
 * @param resource The sprite data in zip format. Filepaths are relative to the assets folder
 *                  (e.g. 'assets/sprites/sprite.zip' => 'sprites/sprite.zip')
 * @param sprite 
 * @returns 
 */
export async function goEditorParseSpriteAnimator(
  resource: Uint8Array,
  sprite: string
): Promise<AnimatorExportData> {
  const json = await callGoWasmFunc('goEditorParseSpriteAnimator', resource, sprite)
  const result: AnimatorExportData = JSON.parse(json)
  return result
}

/**
 * parses skeleton animation data to frames.
 *
 * This function calls the Editor_ParseSpriteAnimation function from the ispx wasm module.
 *
 * @param resource The sprite data in zip format. Filepaths are relative to the assets folder
 *                  (e.g. 'assets/sprites/sprite.zip' => 'sprites/sprite.zip')
 * @param sprite
 * @param animName
 * @returns
 */
export async function goEditorParseSpriteAnimation(
  resource: Uint8Array | ArrayBuffer,
  sprite: string,
  animName: string,
  type: string = 'skeleton'
): Promise<AnimationExportData> {
  console.time("TIME: call goEditorParseSpriteAnimation")
  const result = await callGoWasmFunc('goEditorParseSpriteAnimation', resource, sprite, animName)
  console.timeEnd("TIME: call goEditorParseSpriteAnimation")

  console.time("TIME: convert goEditorParseSpriteAnimation")

  if (type === 'vertex') {
    const frame0 = result.Frames[0]
    for (let i = 0; i < result.Frames.length; i++) {
      const frame = result.Frames[i];
      for (let j = 0; j < frame.RederOrder.length; j++) {
        const i = frame.RederOrder[j]
        const mesh = frame.Meshes[i]
        mesh.Indices = frame0.Meshes[i].Indices
        mesh.Uvs = frame0.Meshes[0].Uvs
        mesh.Vertices = frame.Meshes[0].Vertices
      } 
    }
  }
  console.log('result', result)

  console.timeEnd("TIME: convert goEditorParseSpriteAnimation")

  return result
}
