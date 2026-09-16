import { describe, expect, it } from 'vitest'

import { calculateQiniuEtag } from './kodo'

describe('calculateQiniuEtag', () => {
  it('calculates the ETag of an empty file as a single block', async () => {
    await expect(calculateQiniuEtag(new ArrayBuffer(0))).resolves.toBe('Fto5o-5ea0sNMlW_75VgGJCv2AcJ')
  })
})
