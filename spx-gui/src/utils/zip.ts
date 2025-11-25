/**
 * @desc Zip-related utilities based on fflate
 */

import { unzip as fflateUnzip, zip as fflateZip } from '@nighca/fflate'
import type * as fflate from '@nighca/fflate'

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

const utf8Decoder = new TextDecoder('utf-8')

export function unzip(data: Uint8Array, { signal, ...options }: UnzipOptions = {}) {
  return new Promise<Unzipped>((resolve, reject) => {
    const stopUnzipping = fflateUnzip(
      data,
      {
        // The ZIP spec says:
        // > The ZIP format has historically supported only the original IBM PC character
        // > encoding set, commonly referred to as IBM Code Page 437.
        // > If general purpose bit 11 is unset, the file name and comment SHOULD conform
        // > to the original ZIP character encoding.
        // Now `fflate` defaults to Latin1 for that case, which is not what we want.
        // For now popular zip tools use UTF-8 by default
        // and some of them (e.g. macOS Archive Utility) **do not** set general purpose bit 11.
        // So we just always decode as UTF-8 to provide maximum compatibility.
        decodeFilename: (bytes) => utf8Decoder.decode(bytes),
        ...options
      },
      (err, unzipped) => {
        if (err) reject(err)
        else resolve(unzipped)
      }
    )
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
