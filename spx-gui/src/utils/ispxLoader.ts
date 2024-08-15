/**
 * Load @/assets/ispx/main.wasm for function calls
 *
 * This wasm would automatically add a canvas to the document body but we don't need it.
 */
import rawRunnerHtml from '@/assets/ispx/runner.html?raw'
import wasmExecUrl from '@/assets/wasm_exec.js?url'
import wasmUrl from '@/assets/ispx/main.wasm?url'

interface IframeWindow extends Window {
  goParseSkeletonAnimData: (resource: Uint8Array, sprite: string, animName: string) => any
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

const ispxWasmInitPromise = initIspxWasm()

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
    const iframe = await ispxWasmInitPromise
    const result = iframe[funcName](...args)
    return result
  } catch (error) {
    console.error(`Error calling ${funcName}:`, error)
    throw error
  }
}

export interface AnimExportData {
  Frames: AnimExportFrame[]
}

export interface AnimExportFrame {
  Meshes: AnimExportMesh[]
}

export interface AnimExportMesh {
  Indices: number[]
  Uvs: Point2D[]
  Vertices: Point3D[]
}

export interface Point2D {
  x: number
  y: number
}

export interface Point3D {
  x: number
  y: number
  z: number
}

/**
 * parses skeleton animation data to frames.
 *
 * This function calls the Gopt_ParseSkeletonAnimData function from the ispx wasm module.
 *
 * @param resource The sprite data in zip format. Filepaths are relative to the assets folder
 *                  (e.g. 'assets/sprites/sprite.zip' => 'sprites/sprite.zip')
 * @param sprite
 * @param animName
 * @returns
 */
export async function goParseSkeletonAnimData(
  resource: Uint8Array | ArrayBuffer,
  sprite: string,
  animName: string
): Promise<AnimExportData> {
  return JSON.parse(await callGoWasmFunc('goParseSkeletonAnimData', resource, sprite, animName))
}
