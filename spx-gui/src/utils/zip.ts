/**
 * @desc Zip-related utilities based on fflate
 */

import { unzip as fflateUnzip, zip as fflateZip } from 'fflate'
import type * as fflate from 'fflate'

export type Zippable = fflate.AsyncZippable
export type ZipOptions = fflate.AsyncZipOptions & {
  signal?: AbortSignal
}

export function zip(zippable: Zippable, { signal, ...options }: ZipOptions = {}) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const stopZipping = fflateZip(zippable, options ?? {}, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
    signal?.addEventListener(
      'abort',
      () => {
        stopZipping()
        reject(signal.reason)
      },
      { once: true }
    )
  })
}

export type Unzipped = fflate.Unzipped
export type UnzipOptions = fflate.AsyncUnzipOptions & {
  signal?: AbortSignal
}

export function unzip(data: Uint8Array, { signal, ...options }: UnzipOptions = {}) {
  return new Promise<Unzipped>((resolve, reject) => {
    const stopUnzipping = fflateUnzip(data, options ?? {}, (err, unzipped) => {
      if (err) reject(err)
      else resolve(unzipped)
    })
    signal?.addEventListener(
      'abort',
      () => {
        stopUnzipping()
        reject(signal.reason)
      },
      { once: true }
    )
  })
}
