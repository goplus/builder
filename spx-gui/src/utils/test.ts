/**
 * @desc Helpers for testing
 */

import { File } from '@/models/common/file'

export function sleep(duration = 1000) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), duration))
}

export function delayFile(file: File, duration = 1000) {
  return new File(file!.name, () => sleep(duration).then(() => file!.arrayBuffer()), {
    type: file!.type
  })
}
