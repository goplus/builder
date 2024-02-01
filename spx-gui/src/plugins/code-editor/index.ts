/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-16 10:59:27
 * @FilePath: /builder/spx-gui/src/plugins/code-editor/index.ts
 * @Description: 
 */

import { register } from '@/components/code-editor/Register';
import wasmModuleUrl from '/wasm/format.wasm?url&wasmModule';


const initFormat = async () => {
    const go = new Go();
    const result = await WebAssembly.instantiateStreaming(fetch(wasmModuleUrl), go.importObject)
    go.run(result.instance)
}

const initCodeEditor = async () => {
    register();
    initFormat()
}



export {
    initCodeEditor
}
