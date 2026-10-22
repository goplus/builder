import { describe, expect, it } from 'vitest'

import { calculateQiniuEtag } from './kodo'

describe('calculateQiniuEtag', () => {
  it('calculates the ETag of an empty file as a single block', async () => {
    await expect(calculateQiniuEtag(new ArrayBuffer(0))).resolves.toBe('Fto5o-5ea0sNMlW_75VgGJCv2AcJ')
  })

  it('calculates the ETag of a regular single-block file', async () => {
    const data = new TextEncoder().encode('hello world')
    await expect(calculateQiniuEtag(data.buffer)).resolves.toBe('FiqubDXJT8-0FdvpX0CLnOke6Ebt')
  })

  it('calculates the ETag of a file larger than one block', async () => {
    const data = new Uint8Array(4 * 1024 * 1024 + 1)
    data.fill(0x61, 0, -1)
    data[data.length - 1] = 0x62
    await expect(calculateQiniuEtag(data.buffer)).resolves.toBe('lpVXp3RLT7YisM98iQR-0BSJTzXF')
  })
})
