/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-04 16:39:59
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-04 16:45:22
 * @FilePath: /spx-gui/src/util/FileSystem.ts
 * @Description:
 */
import localforage from 'localforage'

const storage = localforage.createInstance({
  name: 'spx-gui',
  storeName: 'project'
})

async function performAsyncOperation(
  operation: Promise<any>,
  callback?: (err: any, data: any) => void
) {
  try {
    const res = await operation
    callback?.(null, res)
    return res
  } catch (error) {
    callback?.(error, null)
    throw error
  }
}

export function writeFile<T>(
  filename: string,
  data: T,
  callback?: (err: any, data: T) => void
): Promise<T> {
  return performAsyncOperation(storage.setItem(filename, data), callback)
}

export function unlink(filename: string, callback?: (err: any, data: any) => void) {
  return performAsyncOperation(storage.removeItem(filename), callback)
}

export function readFile(filename: string, callback?: (err: any, data: any) => void) {
  return performAsyncOperation(storage.getItem(filename), callback)
}

export function readdir(
  dirname: string,
  callback?: (err: any, data: any) => void
): Promise<string[]> {
  const operation = storage.keys().then((keys) => keys.filter((key) => key.startsWith(dirname)))
  return performAsyncOperation(operation, callback)
}

export function rmdir(dirname: string, callback?: (err: any, data: any) => void) {
  const operation = storage
    .keys()
    .then((keys) =>
      keys.filter((key) => key.startsWith(dirname)).map((key) => storage.removeItem(key))
    )
  return performAsyncOperation(operation, callback)
}
