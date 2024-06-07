import { describe, it, expect } from 'vitest'
import { hashFileCollection } from './hash'

describe('hashFileCollection', () => {
  it('should return correct hash', async () => {
    const fileCollection = {
      file1: 'url1',
      file2: 'url2',
      file3: 'url3'
    }
    const want = 'h1:hJGLZftaDTsyPWv/2/cDCULE87c=' // {"file1":"url1","file2":"url2","file3":"url3"}
    const got = await hashFileCollection(fileCollection)
    expect(got).toBe(want)
  })

  it('should handle disordered file collection', async () => {
    const fileCollection = {
      file2: 'url2',
      file1: 'url1',
      file3: 'url3'
    }
    const want = 'h1:hJGLZftaDTsyPWv/2/cDCULE87c=' // {"file1":"url1","file2":"url2","file3":"url3"}
    const got = await hashFileCollection(fileCollection)
    expect(got).toBe(want)
  })

  it('should handle empty file collection', async () => {
    const fileCollection = {}
    const want = 'h1:vyGp6PvFo4RvsFtPoIWeCReyIC8=' // {}
    const got = await hashFileCollection(fileCollection)
    expect(got).toBe(want)
  })
})
