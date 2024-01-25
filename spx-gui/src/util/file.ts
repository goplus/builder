/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-24 08:49:51
 * @FilePath: \builder\spx-gui\src\util\file.ts
 * @Description: The util of file.
 */

/**
 * Add url property to File with getter and setter.
 * If there is no url, it will be created.
 */
export function addFileUrl() {
    Object.defineProperty(File.prototype, 'url', {
        get() {
            if (!this._url) this._url = URL.createObjectURL(this)
            return this._url
        },
        set(url) {
            this._url = url
        }
    })
}

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

/**
 * Get the prefix of the directory
 * @param dir the directory
 * @returns the prefix of the directory
 */
export function getPrefix(dir: Record<string, any>) {
    let keys = Object.keys(dir);
    let prefix = keys[0];
    for (let i = 1; i < keys.length; i++) {
        while (!keys[i].startsWith(prefix)) {
            prefix = prefix.substring(0, prefix.lastIndexOf('/'));
        }
    }
    if (!prefix) return '';
    return prefix.endsWith('/') ? prefix : prefix + '/';
}