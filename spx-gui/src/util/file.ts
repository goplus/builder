/*
 * @Author: Tu Guobin
 * @Date: 2024-01-17 18:48
 * @LastEditors: Tu Guobin
 * @LastEditTime: 2024-01-17 18:48
 * @FilePath: /spx-gui/src/util/file.ts
 */

/**
 * Map file type to mime type.
 */
const ext2mime: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'avif': 'image/avif',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'json': 'application/json',
    'spx': 'text/plain',
}

/**
 * Get mime type from file extension.
 * @param ext the file extension
 * @returns the mime type
 */
export const getMimeFromExt = (ext: string) => ext2mime[ext] || 'text/plain'

/**
 * Convert array buffer to content.
 * @param arr the array buffer
 * @param type the mime type
 * @param name the file name
 * @returns the content
 */
export const ArrayBuffer2Content = (arr: ArrayBuffer, type: string, name: string = 'untitled') => {
    if (!(arr instanceof ArrayBuffer)) {
        return arr
    }
    switch (type) {
        case 'application/json':
            return JSON.parse(new TextDecoder().decode(arr))
        case 'text/plain':
            return new TextDecoder().decode(arr)
        default:
            return new File([arr], name, { type })
    }
}

/**
 * Convert content to array buffer.
 * @param content the content
 * @param type the mime type
 * @returns the array buffer
 */
export const Content2ArrayBuffer = async (content: any, type: string): Promise<ArrayBuffer> => {
    switch (type) {
        case 'application/json':
            return new TextEncoder().encode(JSON.stringify(content)).buffer
        case 'text/plain':
            return new TextEncoder().encode(content).buffer
        default:
            const reader = new FileReader()
            reader.readAsArrayBuffer(content)
            await new Promise(resolve => reader.onload = resolve)
            return reader.result as ArrayBuffer
    }
}
