import { describe, expect, it } from 'vitest'

import { convertImaAdpcmWavToPcm, isImaAdpcmWav } from './wav'

function appendChunk(wav: number[], type: string, content: number[]) {
  const size = content.length
  wav.push(...new TextEncoder().encode(type), size, 0, 0, 0, ...content)
  if (size % 2 !== 0) wav.push(0)
}

function makeImaAdpcmWav({
  channels = 1,
  blockAlign = 5,
  samplesPerBlock = 3,
  data = [0, 0, 0, 0, 0x21],
  factSampleCount = 0
}: {
  channels?: number
  blockAlign?: number
  samplesPerBlock?: number
  data?: number[]
  factSampleCount?: number
} = {}) {
  const wav = [...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WAVE')]
  const format = new ArrayBuffer(20)
  const formatView = new DataView(format)
  formatView.setUint16(0, 0x11, true)
  formatView.setUint16(2, channels, true)
  formatView.setUint32(4, 22050, true)
  formatView.setUint16(12, blockAlign, true)
  formatView.setUint16(14, 4, true)
  formatView.setUint16(16, 2, true)
  formatView.setUint16(18, samplesPerBlock, true)
  appendChunk(wav, 'fmt ', Array.from(new Uint8Array(format)))
  if (factSampleCount > 0) appendChunk(wav, 'fact', [factSampleCount, 0, 0, 0])
  appendChunk(wav, 'data', data)
  const output = Uint8Array.from(wav)
  new DataView(output.buffer).setUint32(4, output.length - 8, true)
  return output.buffer
}

function makePcmWav() {
  const output = new ArrayBuffer(46)
  const bytes = new Uint8Array(output)
  const view = new DataView(output)
  bytes.set(new TextEncoder().encode('RIFF'), 0)
  view.setUint32(4, 38, true)
  bytes.set(new TextEncoder().encode('WAVEfmt '), 8)
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 22050, true)
  view.setUint32(28, 44100, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  bytes.set(new TextEncoder().encode('data'), 36)
  view.setUint32(40, 2, true)
  view.setInt16(44, 123, true)
  return output
}

describe('isImaAdpcmWav', () => {
  it('identifies IMA ADPCM WAV files', () => {
    expect(isImaAdpcmWav(makeImaAdpcmWav())).toBe(true)
    expect(isImaAdpcmWav(makePcmWav())).toBe(false)
    expect(isImaAdpcmWav(new ArrayBuffer(0))).toBe(false)
  })
})

describe('convertImaAdpcmWavToPcm', () => {
  it('converts IMA ADPCM WAV to 16-bit PCM WAV', () => {
    const normalized = convertImaAdpcmWavToPcm(makeImaAdpcmWav())
    const view = new DataView(normalized)

    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(22050)
    expect(view.getUint16(34, true)).toBe(16)
    expect([view.getInt16(44, true), view.getInt16(46, true), view.getInt16(48, true)]).toEqual([0, 1, 4])
  })

  it('uses fact sample count to trim decoded samples', () => {
    const normalized = convertImaAdpcmWavToPcm(makeImaAdpcmWav({ factSampleCount: 1 }))
    expect(normalized.byteLength).toBe(46)
  })

  it('derives a missing samples-per-block value', () => {
    const normalized = convertImaAdpcmWavToPcm(makeImaAdpcmWav({ samplesPerBlock: 0 }))
    expect(new DataView(normalized).getUint32(40, true)).toBe(6)
  })

  it('decodes multichannel and partial blocks', () => {
    const data = [0, 0, 0, 0, 10, 0, 0, 0, 0x11, 0x11, 0x11, 0x11, 0x22]
    const normalized = convertImaAdpcmWavToPcm(
      makeImaAdpcmWav({ channels: 2, blockAlign: data.length, samplesPerBlock: 9, data })
    )
    const view = new DataView(normalized)

    expect(view.getUint16(22, true)).toBe(2)
    expect(view.getUint32(40, true)).toBe(12)
  })

  it('rejects invalid IMA ADPCM metadata', () => {
    const invalid = makeImaAdpcmWav({ data: [0, 0, 89, 0], blockAlign: 4, samplesPerBlock: 1 })
    expect(() => convertImaAdpcmWavToPcm(invalid)).toThrow('invalid IMA ADPCM step index 89')
  })

  it('rejects IMA ADPCM with more than two channels', () => {
    const invalid = makeImaAdpcmWav({ channels: 3, data: new Array(12).fill(0), blockAlign: 12, samplesPerBlock: 1 })
    expect(() => convertImaAdpcmWavToPcm(invalid)).toThrow('invalid IMA ADPCM WAV metadata')
  })
})
