/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-04 16:46:11
 * @FilePath: /spx-gui/src/util/file.ts
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
    'gmx': 'text/plain',
}

/**
 * Get mime type from file extension.
 * @param ext the file extension
 * @returns the mime type
 */
export const getMimeFromExt = (ext: string) => ext2mime[ext] || 'unknown'

/**
 * Convert array buffer to content.
 * @param arr the array buffer
 * @param type the mime type
 * @param name the file name
 * @returns the content
 */
export const arrayBuffer2Content = (arr: ArrayBuffer, type: string, name: string = 'untitled'): RawFile => {
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
export const content2ArrayBuffer = async (content: any, type: string): Promise<ArrayBuffer> => {
    const reader = new FileReader()
    switch (type) {
        case 'application/json':
            return new TextEncoder().encode(JSON.stringify(content))
        case 'text/plain':
            return new TextEncoder().encode(content)
        default:
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
    const keys = Object.keys(dir);
    let prefix = keys[0];
    for (let i = 1; i < keys.length; i++) {
        while (!keys[i].startsWith(prefix)) {
            prefix = prefix.substring(0, prefix.lastIndexOf('/'));
        }
    }
    if (!prefix) return '';
    return prefix.endsWith('/') ? prefix : prefix + '/';
}

import type { DirPath, RawDir, RawFile } from "@/types/file"
import JSZip from "jszip"

/**
 * Generate a file from content.
 */
export function genFile(content: string, type: string, name: string) {
    return new File([new Blob([content], { type })], name)
}

export async function convertRawDirToDirPath(dir: RawDir): Promise<DirPath> {
    const directory: DirPath = {}
    for (const [path, value] of Object.entries(dir)) {
        const type = typeof value === 'string' ? 'text/plain' : typeof value === 'object' && value instanceof File ? value.type : 'application/json'
        const content = await content2ArrayBuffer(value, type)
        directory[path] = {
            content,
            path,
            type,
            size: content.byteLength,
            modifyTime: (value instanceof File) ? new Date(value.lastModified) : new Date()
        }
    }
    return directory
}

/**
 * Get directory from zip file.
 * @param {File} zipFile the zip file
 * @returns {Promise<DirPath>} the directory of the zip
 *
 * @example
 * const dir = await getDirPathFromZip(zipFile)
 * loadProject(dir)
 *
 * // Your directory structure of zipFile should be organized this way, otherwise you may fail to read resources in `convertDirPathToProject` (which is a step in `loadProject`) and resources that fail to read will be saved in `project.defaultDir`.
 * └─ ProjectName
 *     ├─ main.spx
 *     ├─ spriteName1.spx
 *     ├─ spriteName2.spx
 *     └─ assets
 *         ├─ sprites
 *         │   ├─ spriteName1
 *         │   │   ├─ 1.png
 *         │   │   └─ index.json
 *         │   └─ spriteName2
 *         │       ├─ 2.png
 *         │       └─ index.json
 *         ├─ sounds
 *         │   ├─ soundName1
 *         │   │   ├─ 3.wav
 *         │   │   └─ index.json
 *         │   └─ soundName2
 *         │       ├─ 4.wav
 *         │       └─ index.json
 *         ├─ 5.png
 *         └─ index.json
 */
export async function getDirPathFromZip(zipFile: File): Promise<DirPath> {
    const zip = await JSZip.loadAsync(zipFile);
    const dir: DirPath = {};
    const prefix = getPrefix(zip.files)
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir || relativePath.split('/').pop()?.startsWith(".")) continue
        const path = relativePath.replace(prefix, '')
        const content = await zipEntry.async('arraybuffer')
        const type = getMimeFromExt(relativePath.split('.').pop()!)
        const size = content.byteLength
        const modifyTime = zipEntry.date || new Date();
        dir[path] = {
            content,
            path,
            type,
            size,
            modifyTime
        }
    }
    return dir
}

const zipFileValue = (key: string, value: RawFile): [string, string | File] => {
    if (typeof value === 'string' || value instanceof File) {
        return [key, value]
    } else {
        return [key, JSON.stringify(value)]
    }
}

/**
 * Convert directory object to zip.
 * @param dir the directory object with raw files to be converted
 * @returns the zip
 */
export async function convertRawDirToZip(dir: RawDir): Promise<Blob> {
    const zip = new JSZip();

    const prefix = getPrefix(dir)
    // eslint-disable-next-line prefer-const
    for (let [path, value] of Object.entries(dir)) {
        prefix && (path = path.replace(prefix, ''));
        zip.file(...zipFileValue(path, value));
    }

    const content = await zip.generateAsync({ type: 'blob' })
    return content
}
