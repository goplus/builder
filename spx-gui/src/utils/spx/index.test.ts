import { describe, expect, it } from 'vitest'

import { File } from '@/models/common/file'
import { adaptAudio, getSpxProjectKnowledge } from './index'

function makeImaAdpcmWav() {
  const output = new ArrayBuffer(54)
  const bytes = new Uint8Array(output)
  const view = new DataView(output)
  bytes.set(new TextEncoder().encode('RIFF'), 0)
  view.setUint32(4, 46, true)
  bytes.set(new TextEncoder().encode('WAVEfmt '), 8)
  view.setUint32(16, 20, true)
  view.setUint16(20, 0x11, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 22050, true)
  view.setUint16(32, 5, true)
  view.setUint16(34, 4, true)
  view.setUint16(36, 2, true)
  view.setUint16(38, 3, true)
  bytes.set(new TextEncoder().encode('data'), 40)
  view.setUint32(44, 5, true)
  bytes.set([0, 0, 0, 0, 0x21], 48)
  return output
}

describe('getSpxProjectKnowledge', () => {
  it('builds SPX project knowledge from fixed documents', () => {
    const knowledge = getSpxProjectKnowledge()

    expect(knowledge).toContain('# About spx')
    expect(knowledge).toContain('# spx APIs')
  })
})

describe('adaptAudio', () => {
  it('keeps MP3 files unchanged', async () => {
    const file = new File('sound.mp3', async () => new ArrayBuffer(0))
    await expect(adaptAudio(file)).resolves.toBe(file)
  })

  it('converts IMA ADPCM WAV files to PCM WAV files', async () => {
    const file = new File('sound.wav', async () => makeImaAdpcmWav())
    const adapted = await adaptAudio(file)
    const content = await adapted.arrayBuffer()

    expect(adapted).not.toBe(file)
    expect(adapted.name).toBe('sound.wav')
    expect(adapted.type).toBe('audio/wav')
    expect(new DataView(content).getUint16(20, true)).toBe(1)
  })

  it('keeps PCM WAV files unchanged', async () => {
    const content = makeImaAdpcmWav()
    new DataView(content).setUint16(20, 1, true)
    const file = new File('sound.wav', async () => content)

    await expect(adaptAudio(file)).resolves.toBe(file)
  })
})
