const waveFormatPcm = 1
const waveFormatImaAdpcm = 0x11
const maxImaAdpcmChannels = 2

type ImaAdpcmFormat = {
  channels: number
  sampleRate: number
  blockAlign: number
  samplesPerBlock: number
}

type ImaState = {
  predictor: number
  index: number
}

type ParsedWav = {
  encoding: number
  format: ImaAdpcmFormat | null
  encodedData: Uint8Array | null
  factSampleCount: number
}

const imaIndexTable = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8]
const imaStepTable = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118,
  130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060,
  1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484,
  7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767
]

function readString(data: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...data.subarray(offset, offset + length))
}

function decodeImaNibbles(data: Uint8Array, state: ImaState, samples: number[]) {
  for (const byte of data) {
    for (const code of [byte & 0x0f, byte >> 4]) {
      const step = imaStepTable[state.index]
      let difference = step >> 3
      if ((code & 1) !== 0) difference += step >> 2
      if ((code & 2) !== 0) difference += step >> 1
      if ((code & 4) !== 0) difference += step
      state.predictor += (code & 8) !== 0 ? -difference : difference
      state.predictor = Math.max(-32768, Math.min(32767, state.predictor))
      state.index = Math.max(0, Math.min(88, state.index + imaIndexTable[code]))
      samples.push(state.predictor)
    }
  }
}

function decodeImaAdpcm(data: Uint8Array, format: ImaAdpcmFormat) {
  const blockCount = Math.ceil(data.length / format.blockAlign)
  const output = new Int16Array(data.length * 2 + blockCount * format.channels)
  let outputLength = 0
  for (let offset = 0; offset < data.length; offset += format.blockAlign) {
    const block = data.subarray(offset, Math.min(offset + format.blockAlign, data.length))
    if (block.length < format.channels * 4) throw new Error('truncated IMA ADPCM block')

    const view = new DataView(block.buffer, block.byteOffset, block.byteLength)
    const states: ImaState[] = []
    const channelSamples: number[][] = []
    for (let channel = 0; channel < format.channels; channel++) {
      const position = channel * 4
      const index = view.getUint8(position + 2)
      if (index > 88) throw new Error(`invalid IMA ADPCM step index ${index}`)
      const state = { predictor: view.getInt16(position, true), index }
      states.push(state)
      channelSamples.push([state.predictor])
    }

    let payload = block.subarray(format.channels * 4)
    if (format.channels === 1) {
      decodeImaNibbles(payload, states[0], channelSamples[0])
    } else {
      while (payload.length > 0) {
        for (let channel = 0; channel < format.channels && payload.length > 0; channel++) {
          const size = Math.min(4, payload.length)
          decodeImaNibbles(payload.subarray(0, size), states[channel], channelSamples[channel])
          payload = payload.subarray(size)
        }
      }
    }

    const sampleCount = Math.min(format.samplesPerBlock, ...channelSamples.map((samples) => samples.length))
    for (let index = 0; index < sampleCount; index++) {
      for (let channel = 0; channel < format.channels; channel++) {
        output[outputLength++] = channelSamples[channel][index]
      }
    }
  }
  return output.subarray(0, outputLength)
}

function makePcmWav(samples: Int16Array, channels: number, sampleRate: number) {
  const dataSize = samples.length * 2
  const output = new ArrayBuffer(44 + dataSize)
  const bytes = new Uint8Array(output)
  const view = new DataView(output)
  bytes.set(new TextEncoder().encode('RIFF'), 0)
  view.setUint32(4, 36 + dataSize, true)
  bytes.set(new TextEncoder().encode('WAVEfmt '), 8)
  view.setUint32(16, 16, true)
  view.setUint16(20, waveFormatPcm, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  bytes.set(new TextEncoder().encode('data'), 36)
  view.setUint32(40, dataSize, true)
  for (let index = 0; index < samples.length; index++) {
    view.setInt16(44 + index * 2, samples[index], true)
  }
  return output
}

function parseWav(source: ArrayBuffer): ParsedWav | null {
  const data = new Uint8Array(source)
  if (data.length < 12 || readString(data, 0, 4) !== 'RIFF' || readString(data, 8, 4) !== 'WAVE') {
    return null
  }

  const view = new DataView(source)
  let format: ImaAdpcmFormat | null = null
  let encoding = 0
  let encodedData: Uint8Array | null = null
  let factSampleCount = 0
  for (let offset = 12; offset + 8 <= data.length; ) {
    const chunkSize = view.getUint32(offset + 4, true)
    const start = offset + 8
    const end = start + chunkSize
    if (end < start || end > data.length) throw new Error(`invalid WAV chunk at offset ${offset}`)

    const chunkType = readString(data, offset, 4)
    if (chunkType === 'fmt ') {
      if (chunkSize < 16) throw new Error('invalid WAV fmt chunk')
      encoding = view.getUint16(start, true)
      const channels = view.getUint16(start + 2, true)
      const sampleRate = view.getUint32(start + 4, true)
      const blockAlign = view.getUint16(start + 12, true)
      const samplesPerBlock = chunkSize >= 20 ? view.getUint16(start + 18, true) : 0
      format = { channels, sampleRate, blockAlign, samplesPerBlock }
    } else if (chunkType === 'fact' && chunkSize >= 4) {
      factSampleCount = view.getUint32(start, true)
    } else if (chunkType === 'data') {
      encodedData = data.subarray(start, end)
    }
    offset = end + (chunkSize % 2)
  }

  return { encoding, format, encodedData, factSampleCount }
}

export function isImaAdpcmWav(source: ArrayBuffer) {
  return parseWav(source)?.encoding === waveFormatImaAdpcm
}

/** Convert an IMA ADPCM WAV to a 16-bit PCM WAV. */
export function convertImaAdpcmWavToPcm(source: ArrayBuffer) {
  const wav = parseWav(source)
  if (wav == null || wav.encoding !== waveFormatImaAdpcm) throw new Error('IMA ADPCM WAV expected')
  const { format, encodedData, factSampleCount } = wav
  if (
    format == null ||
    format.channels === 0 ||
    format.channels > maxImaAdpcmChannels ||
    format.blockAlign < format.channels * 4 ||
    format.sampleRate === 0 ||
    encodedData == null ||
    encodedData.length === 0
  ) {
    throw new Error('invalid IMA ADPCM WAV metadata')
  }
  const samplesPerBlock =
    format.samplesPerBlock === 0
      ? 1 + Math.floor(((format.blockAlign - format.channels * 4) * 2) / format.channels)
      : format.samplesPerBlock

  let samples = decodeImaAdpcm(encodedData, { ...format, samplesPerBlock })
  const expectedSampleCount = factSampleCount * format.channels
  if (expectedSampleCount > 0 && samples.length > expectedSampleCount) {
    samples = samples.slice(0, expectedSampleCount)
  }
  return makePcmWav(samples, format.channels, format.sampleRate)
}
