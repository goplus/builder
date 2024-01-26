import "/node_modules/localforage/dist/localforage.js";
import "/node_modules/jszip/dist/jszip.js";

/**
 * A localforage instance. It is an instance of localforage with name "wasm".
 */
const storage = localforage.createInstance({
    name: "wasm",
    storeName: "wasm"
})

/**
 * Read wasm from zip.
 * @param {string | Blob } zip the zip
 * @returns the wasm buffer
 */
export const readWasmFromZip = async (zip) => {
    try {
        if (typeof zip === "string") {
            zip = await fetch(zip).then(res => res.blob())
        }
        const zipFile = await JSZip.loadAsync(zip);
        const arrayBuffer = await Object.values(zipFile.files)[0]?.async("arraybuffer");
        return new Uint8Array(arrayBuffer);
    } catch (e) {
        console.warn(e)
        return null
    }
}


/**
 * Read wasm from url. The url should be a wasm file.
 * @param url the url
 * @returns the wasm buffer
 */
export const readWasmFromURL = async (url) => {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
    } catch (e) {
        console.warn(e)
        return null
    }
}


/**
 * Save wasm to storage (IndexedDB).
 * @param buffer the wasm buffer
 * @param name the name of the wasm
 */
export const saveWasm = async (buffer, name = "main.wasm") => {
    storage.setItem(name, buffer);
}

/**
 * Read wasm from storage (IndexedDB).
 * @param name the name of the wasm
 * @returns the wasm buffer
 */
export const readWasmFromStorage = async (name = "main.wasm") => {
    const buffer = await storage.getItem(name);
    return buffer || null;
}

/**
 * Remove wasm from storage.
 * @param name 
 */
export const removeWasm = async (name = "main.wasm") => {
    storage.removeItem(name);
}