import JSzip from "jszip";
import localforage from "localforage";

/**
 * A localforage instance. It is an instance of localforage with name "wasm".
 */
const storage = localforage.createInstance({
    name: "wasm",
    storeName: "wasm"
})

/**
 * Read wasm from zip.
 * @param zip the zip
 * @returns the wasm buffer
 */
export const readWasmFromZip = async (zip: Blob): Promise<Uint8Array> => {
    const zipFile = await JSzip.loadAsync(zip);
    const arrayBuffer = await Object.values(zipFile.files)[0]?.async("arraybuffer");
    return new Uint8Array(arrayBuffer);
}

/**
 * Read wasm from url. The url should be a wasm file.
 * @param url the url
 * @returns the wasm buffer
 */
export const readWasmFromURL = async (url: string): Promise<Uint8Array> => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

/**
 * Save wasm to storage (IndexedDB).
 * @param buffer the wasm buffer
 * @param name the name of the wasm
 */
export const saveWasm = async (buffer: Uint8Array, name: string = "main.wasm") => {
    storage.setItem(name, buffer);
}

/**
 * Read wasm from storage (IndexedDB).
 * @param name the name of the wasm
 * @returns the wasm buffer
 */
export const readWasmFromStorage = async (name: string = "main.wasm") => {
    const buffer = await storage.getItem(name) as Uint8Array;
    return buffer || null;
}

/**
 * Init wasm.
 * @param buffer the wasm buffer
 */
export const initWasm = async (buffer: Uint8Array) => {
    // TODO: reference https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/instantiate and builder/offlineSpx/main.html
    // const wasm = await WebAssembly.instantiate(buffer, importObject);
}